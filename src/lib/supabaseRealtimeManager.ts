/**
 * MIRA — Supabase Realtime Singleton Channel Manager
 * Prevents memory leaks and duplicate WebSocket channels by reusing singleton subscriptions.
 */

import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

class SupabaseRealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();

  getChannel(channelName: string): RealtimeChannel {
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase.channel(channelName);
    this.channels.set(channelName, channel);
    return channel;
  }

  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  unsubscribeAll() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }
}

export const realtimeManager = new SupabaseRealtimeManager();
