/**
 * Centralized Supabase Realtime Module
 *
 * Architecture:
 *  - Single channel per family_id, shared across all subscribers
 *  - Listeners registered per table (fd_members, fd_tasks, fd_completions, fd_rewards, fd_redemptions)
 *  - useRealtime() hook: components register a callback; cleanup is automatic
 *  - On unmount, listener is removed. Channel is closed only when 0 listeners remain
 */

import { useEffect, useRef } from 'react'
import { supabase } from './supabase.js'

// ── Internal state ──────────────────────────────────────────────────────────
let activeChannel = null        // The single Supabase Realtime channel
let activeFamilyId = null       // The family_id the channel is scoped to
const listeners = new Map()     // Map<string (table), Set<Function (callback)>>
let listenerCount = 0           // Total number of registered listeners

// Tables to watch (Supabase Realtime must have them enabled)
const WATCHED_TABLES = [
  'fd_tasks',
  'fd_completions',
  'fd_members',
  'fd_rewards',
  'fd_redemptions',
]

// ── Channel management ──────────────────────────────────────────────────────

function getFamilyId() {
  try {
    const s = localStorage.getItem('fd_session')
    if (s) return JSON.parse(s).family_id || null
  } catch {}
  return null
}

function notifyListeners(table, eventType, newRecord, oldRecord) {
  const tableListeners = listeners.get(table)
  if (!tableListeners) return
  tableListeners.forEach(cb => {
    try {
      cb({ table, eventType, newRecord, oldRecord })
    } catch (err) {
      console.error('[Realtime] Listener error:', err)
    }
  })
  // Also notify '*' (all-table) listeners
  const allListeners = listeners.get('*')
  if (allListeners) {
    allListeners.forEach(cb => {
      try {
        cb({ table, eventType, newRecord, oldRecord })
      } catch (err) {}
    })
  }
}

function createChannel(familyId) {
  if (activeChannel) {
    supabase.removeChannel(activeChannel)
    activeChannel = null
  }

  console.log('[Realtime] Creating channel for family:', familyId)

  const channelConfig = supabase.channel(`family_${familyId}`, {
    config: { broadcast: { self: false } }
  })

  // Register postgres_changes listeners for each table
  WATCHED_TABLES.forEach(table => {
    const filter = familyId ? `family_id=eq.${familyId}` : undefined

    channelConfig.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        // Most tables have family_id. fd_members uses it too.
        ...(filter ? { filter } : {})
      },
      (payload) => {
        console.log(`[Realtime] ${table} ${payload.eventType}:`, payload)
        notifyListeners(table, payload.eventType, payload.new, payload.old)
      }
    )
  })

  channelConfig.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Realtime] ✅ Connected for family:', familyId)
    } else if (status === 'CLOSED') {
      console.log('[Realtime] ⛔ Channel closed')
    } else if (status === 'CHANNEL_ERROR') {
      console.error('[Realtime] ❌ Channel error – will retry')
      // Retry after a delay if there are still listeners
      if (listenerCount > 0) {
        setTimeout(() => ensureChannel(), 3000)
      }
    }
  })

  activeChannel = channelConfig
  activeFamilyId = familyId
}

function ensureChannel() {
  const familyId = getFamilyId()
  // (Re)create if: no channel, different family, or channel is not open
  if (!activeChannel || activeFamilyId !== familyId) {
    createChannel(familyId)
  }
}

function destroyChannelIfEmpty() {
  if (listenerCount <= 0 && activeChannel) {
    console.log('[Realtime] No more listeners – closing channel')
    supabase.removeChannel(activeChannel)
    activeChannel = null
    activeFamilyId = null
    listenerCount = 0
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Subscribe to realtime changes for a table.
 * @param {string} table - Table name or '*' for all tables
 * @param {Function} callback - Called with { table, eventType, newRecord, oldRecord }
 * @returns {Function} unsubscribe function
 */
export function subscribe(table, callback) {
  if (!listeners.has(table)) {
    listeners.set(table, new Set())
  }
  listeners.get(table).add(callback)
  listenerCount++
  ensureChannel()
  return () => {
    const set = listeners.get(table)
    if (set) set.delete(callback)
    listenerCount--
    destroyChannelIfEmpty()
  }
}

// ── React Hook ──────────────────────────────────────────────────────────────

/**
 * useRealtime – React hook that triggers a callback on realtime DB changes.
 *
 * @param {string|string[]} tables  - Table(s) to watch, or '*' for all
 * @param {Function} onChangeFn     - Called on any change event
 * @param {any[]} deps              - Extra useEffect deps (usually [])
 *
 * Usage:
 *   useRealtime(['fd_tasks', 'fd_completions'], () => loadData())
 *   useRealtime('*', () => setCounter(c => c + 1))
 */
export function useRealtime(tables, onChangeFn, deps = []) {
  // Stable ref for the callback to avoid re-subscribing on every render
  const cbRef = useRef(onChangeFn)
  cbRef.current = onChangeFn

  useEffect(() => {
    const tableList = Array.isArray(tables) ? tables : [tables]
    const unsubs = tableList.map(table =>
      subscribe(table, (event) => cbRef.current(event))
    )
    return () => unsubs.forEach(u => u())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
