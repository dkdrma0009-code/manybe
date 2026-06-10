import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../api/supabase'

export interface ChannelInsight {
  icon: string
  text: string
}

export interface ChannelAnalysis {
  channel_id: string
  sentiment_score: number
  sentiment_label: string
  audience_keywords: string[]
  ad_ratio: number
  insights: ChannelInsight[]
  inflow_keywords: string[]
  audience_categories: string[]
  inflow_source: 'analytics' | 'ai'
  audience_categories_source: 'analytics' | 'ai'
  sample_size: number
  computed_at: string
}

export function useChannelAnalysis(userId: string | undefined, channelId: string | undefined) {
  const [analysis, setAnalysis] = useState<ChannelAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId || !channelId) return
    setLoading(true)
    const { data } = await supabase
      .from('channel_analyses')
      .select('*')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .single()
    if (data) setAnalysis(data as ChannelAnalysis)
    setLoading(false)
  }, [userId, channelId])

  useEffect(() => { load() }, [load])

  const runAnalysis = useCallback(async () => {
    if (!userId || !channelId) return
    setAnalyzing(true)
    setError(null)
    const { data, error: fnError } = await supabase.functions.invoke('analyze-channel', {
      body: { channel_id: channelId, user_id: userId },
    })
    if (fnError) {
      setError('분석 중 오류가 발생했습니다.')
    } else if (data) {
      setAnalysis({ ...data, channel_id: channelId })
    }
    setAnalyzing(false)
  }, [userId, channelId])

  // Stale check: re-analyze if older than 30 days
  const isStale = analysis
    ? Date.now() - new Date(analysis.computed_at).getTime() > 30 * 86_400_000
    : false

  return { analysis, loading, analyzing, error, isStale, runAnalysis }
}
