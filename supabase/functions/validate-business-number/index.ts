// 공공데이터포털 키는 URL 인코딩 상태로 발급됨 → 디코딩 후 사용
const rawKey = Deno.env.get('NTS_API_KEY') ?? ''
const NTS_API_KEY = decodeURIComponent(rawKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { b_no } = await req.json() as { b_no: string }
    const digits = b_no.replace(/\D/g, '')

    if (digits.length !== 10) {
      return new Response(
        JSON.stringify({ valid: false, message: '사업자등록번호는 10자리여야 합니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // serviceKey를 쿼리 파라미터로도 전달 (일부 환경에서 헤더 인증 대신 필요)
    const url = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(NTS_API_KEY)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Infuser ${NTS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ b_no: [digits] }),
    })

    if (!res.ok) {
      throw new Error(`NTS API error: ${res.status}`)
    }

    const json = await res.json()
    const item = json.data?.[0]

    if (!item) {
      return new Response(
        JSON.stringify({ valid: false, message: '사업자 정보를 확인할 수 없습니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const sttCd = item.b_stt_cd as string

    if (sttCd === '01') {
      return new Response(
        JSON.stringify({ valid: true, status: item.b_stt, message: '정상 사업자입니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (sttCd === '02') {
      return new Response(
        JSON.stringify({ valid: false, status: item.b_stt, message: '휴업 중인 사업자입니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (sttCd === '03') {
      return new Response(
        JSON.stringify({ valid: false, status: item.b_stt, message: '폐업한 사업자입니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 미등록 번호
    return new Response(
      JSON.stringify({ valid: false, status: item.b_stt ?? '미확인', message: '등록되지 않은 사업자등록번호입니다.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, message: '검증 서비스에 일시적인 오류가 발생했습니다.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
