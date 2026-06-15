export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      advertiser_profiles: {
        Row: {
          agency_name: string | null
          business_number: string | null
          business_verified: boolean | null
          company_name: string
          created_at: string | null
          domain_email: string | null
          email_verified: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency_name?: string | null
          business_number?: string | null
          business_verified?: boolean | null
          company_name: string
          created_at?: string | null
          domain_email?: string | null
          email_verified?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency_name?: string | null
          business_number?: string | null
          business_verified?: boolean | null
          company_name?: string
          created_at?: string | null
          domain_email?: string | null
          email_verified?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_proposals: {
        Row: {
          advertiser_id: string | null
          amount: number
          brand_name: string
          created_at: string
          creator_id: string
          id: string
          message: string
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advertiser_id?: string | null
          amount?: number
          brand_name: string
          created_at?: string
          creator_id: string
          id?: string
          message: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string | null
          amount?: number
          brand_name?: string
          created_at?: string
          creator_id?: string
          id?: string
          message?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      channel_analyses: {
        Row: {
          ad_ratio: number
          audience_categories: string[]
          audience_categories_source: string
          audience_keywords: string[]
          channel_id: string
          computed_at: string
          id: string
          inflow_keywords: string[]
          inflow_source: string
          insights: Json
          sample_size: number
          sentiment_label: string
          sentiment_score: number
          user_id: string
        }
        Insert: {
          ad_ratio?: number
          audience_categories?: string[]
          audience_categories_source?: string
          audience_keywords?: string[]
          channel_id: string
          computed_at?: string
          id?: string
          inflow_keywords?: string[]
          inflow_source?: string
          insights?: Json
          sample_size?: number
          sentiment_label?: string
          sentiment_score?: number
          user_id: string
        }
        Update: {
          ad_ratio?: number
          audience_categories?: string[]
          audience_categories_source?: string
          audience_keywords?: string[]
          channel_id?: string
          computed_at?: string
          id?: string
          inflow_keywords?: string[]
          inflow_source?: string
          insights?: Json
          sample_size?: number
          sentiment_label?: string
          sentiment_score?: number
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_role: string
          thread_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_role: string
          thread_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_role?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      content_schedules: {
        Row: {
          content_url: string | null
          created_at: string | null
          creator_id: string
          deal_id: string | null
          id: string
          platform: string | null
          reminder_at: string | null
          scheduled_at: string
          status: string | null
          title: string
        }
        Insert: {
          content_url?: string | null
          created_at?: string | null
          creator_id: string
          deal_id?: string | null
          id?: string
          platform?: string | null
          reminder_at?: string | null
          scheduled_at: string
          status?: string | null
          title: string
        }
        Update: {
          content_url?: string | null
          created_at?: string | null
          creator_id?: string
          deal_id?: string | null
          id?: string
          platform?: string | null
          reminder_at?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_schedules_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_schedules_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_channels: {
        Row: {
          audience_age: Json | null
          audience_gender: Json | null
          avg_views: number | null
          channel_name: string | null
          created_at: string | null
          creator_id: string
          engagement_rate: number | null
          id: string
          last_synced_at: string | null
          platform: string
          platform_channel_id: string
          profile_image_url: string | null
          subscriber_count: number | null
          subscriber_history: Json | null
          token_expires_at: string | null
          views_history: Json | null
        }
        Insert: {
          audience_age?: Json | null
          audience_gender?: Json | null
          avg_views?: number | null
          channel_name?: string | null
          created_at?: string | null
          creator_id: string
          engagement_rate?: number | null
          id?: string
          last_synced_at?: string | null
          platform: string
          platform_channel_id: string
          profile_image_url?: string | null
          subscriber_count?: number | null
          subscriber_history?: Json | null
          token_expires_at?: string | null
          views_history?: Json | null
        }
        Update: {
          audience_age?: Json | null
          audience_gender?: Json | null
          avg_views?: number | null
          channel_name?: string | null
          created_at?: string | null
          creator_id?: string
          engagement_rate?: number | null
          id?: string
          last_synced_at?: string | null
          platform?: string
          platform_channel_id?: string
          profile_image_url?: string | null
          subscriber_count?: number | null
          subscriber_history?: Json | null
          token_expires_at?: string | null
          views_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_channels_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          badge_data: Json | null
          bio: string | null
          category: string[] | null
          created_at: string | null
          handle: string
          id: string
          inbound_enabled: boolean | null
          location: string | null
          media_kit_enabled: boolean | null
          pricing_guide: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badge_data?: Json | null
          bio?: string | null
          category?: string[] | null
          created_at?: string | null
          handle: string
          id?: string
          inbound_enabled?: boolean | null
          location?: string | null
          media_kit_enabled?: boolean | null
          pricing_guide?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badge_data?: Json | null
          bio?: string | null
          category?: string[] | null
          created_at?: string | null
          handle?: string
          id?: string
          inbound_enabled?: boolean | null
          location?: string | null
          media_kit_enabled?: boolean | null
          pricing_guide?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_contacts: {
        Row: {
          company: string | null
          created_at: string | null
          deal_id: string | null
          email: string | null
          id: string
          kakao_id: string | null
          memo: string | null
          name: string
          phone: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          deal_id?: string | null
          email?: string | null
          id?: string
          kakao_id?: string | null
          memo?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          deal_id?: string | null
          email?: string | null
          id?: string
          kakao_id?: string | null
          memo?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          advertiser_id: string | null
          amount: number | null
          brand: string | null
          contact_info: Json | null
          content_deadline: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          notes: string | null
          platform: string | null
          source: string | null
          status: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          advertiser_id?: string | null
          amount?: number | null
          brand?: string | null
          contact_info?: Json | null
          content_deadline?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          advertiser_id?: string | null
          amount?: number | null
          brand?: string | null
          contact_info?: Json | null
          content_deadline?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertiser_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_creator_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      media_kit_inquiries: {
        Row: {
          brand_name: string
          budget: number | null
          business_number: string | null
          contact_email: string
          created_at: string | null
          deadline: string | null
          deal_id: string | null
          id: string
          is_read: boolean
          media_kit_id: string | null
          proposal: string | null
        }
        Insert: {
          brand_name: string
          budget?: number | null
          business_number?: string | null
          contact_email: string
          created_at?: string | null
          deadline?: string | null
          deal_id?: string | null
          id?: string
          is_read?: boolean
          media_kit_id?: string | null
          proposal?: string | null
        }
        Update: {
          brand_name?: string
          budget?: number | null
          business_number?: string | null
          contact_email?: string
          created_at?: string | null
          deadline?: string | null
          deal_id?: string | null
          id?: string
          is_read?: boolean
          media_kit_id?: string | null
          proposal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_kit_inquiries_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_kit_inquiries_media_kit_id_fkey"
            columns: ["media_kit_id"]
            isOneToOne: false
            referencedRelation: "media_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      media_kit_views: {
        Row: {
          created_at: string | null
          creator_id: string | null
          id: string
          referrer: string | null
          user_id: string | null
          viewer_id: string | null
          viewer_ip: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          id?: string
          referrer?: string | null
          user_id?: string | null
          viewer_id?: string | null
          viewer_ip?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          id?: string
          referrer?: string | null
          user_id?: string | null
          viewer_id?: string | null
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_kit_views_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_kit_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_kits: {
        Row: {
          badge_data: Json
          badges: string[] | null
          bio: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          highlights: Json | null
          id: string
          is_directory_public: boolean
          is_form_enabled: boolean | null
          is_price_public: boolean
          past_brands: Json | null
          pricing: Json | null
          section_order: string[] | null
          slug: string
          theme: string | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          badge_data?: Json
          badges?: string[] | null
          bio?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          highlights?: Json | null
          id?: string
          is_directory_public?: boolean
          is_form_enabled?: boolean | null
          is_price_public?: boolean
          past_brands?: Json | null
          pricing?: Json | null
          section_order?: string[] | null
          slug: string
          theme?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          badge_data?: Json
          badges?: string[] | null
          bio?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          highlights?: Json | null
          id?: string
          is_directory_public?: boolean
          is_form_enabled?: boolean | null
          is_price_public?: boolean
          past_brands?: Json | null
          pricing?: Json | null
          section_order?: string[] | null
          slug?: string
          theme?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      message_threads: {
        Row: {
          created_at: string | null
          creator_id: string | null
          id: string
          last_message_at: string | null
          proposal_id: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          id?: string
          last_message_at?: string | null
          proposal_id?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          id?: string
          last_message_at?: string | null
          proposal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "advertiser_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          deal_id: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deal_id: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deal_id?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          link: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          advertiser_onboarding_done: boolean
          avatar_url: string | null
          business_number: string | null
          company_name: string | null
          created_at: string | null
          display_name: string | null
          full_name: string | null
          id: string
          push_token: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          advertiser_onboarding_done?: boolean
          avatar_url?: string | null
          business_number?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          full_name?: string | null
          id: string
          push_token?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          advertiser_onboarding_done?: boolean
          avatar_url?: string | null
          business_number?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          full_name?: string | null
          id?: string
          push_token?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      proposal_creators: {
        Row: {
          creator_id: string
          estimated_cpm: number | null
          estimated_reach: number | null
          id: string
          notes: string | null
          proposal_id: string
          recommended_reason: string | null
          sort_order: number | null
        }
        Insert: {
          creator_id: string
          estimated_cpm?: number | null
          estimated_reach?: number | null
          id?: string
          notes?: string | null
          proposal_id: string
          recommended_reason?: string | null
          sort_order?: number | null
        }
        Update: {
          creator_id?: string
          estimated_cpm?: number | null
          estimated_reach?: number | null
          id?: string
          notes?: string | null
          proposal_id?: string
          recommended_reason?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_creators_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_creators_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          advertiser_id: string
          budget_range: Json | null
          campaign_brief: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_public: boolean | null
          share_token: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          advertiser_id: string
          budget_range?: Json | null
          campaign_brief?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          share_token?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          advertiser_id?: string
          budget_range?: Json | null
          campaign_brief?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          share_token?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_records: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string
          deal_id: string | null
          id: string
          notes: string | null
          tax_withheld: number | null
          type: string | null
          year_month: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id: string
          deal_id?: string | null
          id?: string
          notes?: string | null
          tax_withheld?: number | null
          type?: string | null
          year_month: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string
          deal_id?: string | null
          id?: string
          notes?: string | null
          tax_withheld?: number | null
          type?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_records_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_records_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      revenues: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          is_withholding: boolean | null
          source: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          is_withholding?: boolean | null
          source?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          is_withholding?: boolean | null
          source?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string | null
          deal_id: string | null
          description: string | null
          id: string
          is_notified: boolean | null
          memo: string | null
          schedule_date: string
          schedule_time: string | null
          start_time: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          is_notified?: boolean | null
          memo?: string | null
          schedule_date: string
          schedule_time?: string | null
          start_time?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          is_notified?: boolean | null
          memo?: string | null
          schedule_date?: string
          schedule_time?: string | null
          start_time?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_channel_tokens: {
        Row: {
          platform: string
          updated_at: string
          user_id: string
          youtube_access_token: string | null
          youtube_refresh_token: string | null
          youtube_token_expires_at: string | null
        }
        Insert: {
          platform: string
          updated_at?: string
          user_id: string
          youtube_access_token?: string | null
          youtube_refresh_token?: string | null
          youtube_token_expires_at?: string | null
        }
        Update: {
          platform?: string
          updated_at?: string
          user_id?: string
          youtube_access_token?: string | null
          youtube_refresh_token?: string | null
          youtube_token_expires_at?: string | null
        }
        Relationships: []
      }
      social_channels: {
        Row: {
          avg_views: number | null
          channel_id: string | null
          channel_name: string | null
          channel_url: string | null
          created_at: string | null
          engagement_rate: number | null
          handle: string | null
          id: string
          is_verified: boolean | null
          platform: string
          profile_image_url: string | null
          subscriber_count: number | null
          subscriber_history: Json
          thumbnail_url: string | null
          total_view_count: number | null
          updated_at: string | null
          user_id: string | null
          video_count: number | null
          view_count: number | null
          views_history: Json
        }
        Insert: {
          avg_views?: number | null
          channel_id?: string | null
          channel_name?: string | null
          channel_url?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          handle?: string | null
          id?: string
          is_verified?: boolean | null
          platform: string
          profile_image_url?: string | null
          subscriber_count?: number | null
          subscriber_history?: Json
          thumbnail_url?: string | null
          total_view_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_count?: number | null
          view_count?: number | null
          views_history?: Json
        }
        Update: {
          avg_views?: number | null
          channel_id?: string | null
          channel_name?: string | null
          channel_url?: string | null
          created_at?: string | null
          engagement_rate?: number | null
          handle?: string | null
          id?: string
          is_verified?: boolean | null
          platform?: string
          profile_image_url?: string | null
          subscriber_count?: number | null
          subscriber_history?: Json
          thumbnail_url?: string | null
          total_view_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_count?: number | null
          view_count?: number | null
          views_history?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          plan: string
          portone_id: string | null
          started_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan: string
          portone_id?: string | null
          started_at: string
          status: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: string
          portone_id?: string | null
          started_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_records: {
        Row: {
          created_at: string | null
          estimated_income_tax: number | null
          id: string
          memo: string | null
          month: number | null
          net_revenue: number
          total_revenue: number
          user_id: string | null
          withholding_amount: number
          year: number
        }
        Insert: {
          created_at?: string | null
          estimated_income_tax?: number | null
          id?: string
          memo?: string | null
          month?: number | null
          net_revenue: number
          total_revenue: number
          user_id?: string | null
          withholding_amount: number
          year: number
        }
        Update: {
          created_at?: string | null
          estimated_income_tax?: number | null
          id?: string
          memo?: string | null
          month?: number | null
          net_revenue?: number
          total_revenue?: number
          user_id?: string | null
          withholding_amount?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          monthly_goal: number | null
          name: string
          plan: string | null
          platform: string[] | null
          profile_image: string | null
          subscriber_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          monthly_goal?: number | null
          name: string
          plan?: string | null
          platform?: string[] | null
          profile_image?: string | null
          subscriber_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          monthly_goal?: number | null
          name?: string
          plan?: string | null
          platform?: string[] | null
          profile_image?: string | null
          subscriber_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_advertiser_profile: {
        Args: { company_name: string; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      deal_status:
        | "proposed"
        | "negotiating"
        | "producing"
        | "completed"
        | "settled"
        | "cancelled"
        | "inquiry"
        | "reviewing"
        | "in_progress"
        | "uploaded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      deal_status: [
        "proposed",
        "negotiating",
        "producing",
        "completed",
        "settled",
        "cancelled",
        "inquiry",
        "reviewing",
        "in_progress",
        "uploaded",
      ],
    },
  },
} as const
