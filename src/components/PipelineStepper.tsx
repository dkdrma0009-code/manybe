import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors } from '../constants/colors';
import { motion } from '../constants/motion';
import { typography } from '../constants/typography';
import { PIPELINE_STAGES, STAGE_INDEX, STAGE_CONFIG, STAGE_HINTS } from '../constants/dealStatus';

interface Props {
  status: string;
  onChange: (s: string) => void;
  showHint?: boolean;
}

export default function PipelineStepper({ status, onChange, showHint = true }: Props) {
  const currentIdx = STAGE_INDEX[status] ?? 0;
  const cfg = STAGE_CONFIG[status] ?? STAGE_CONFIG.inquiry;

  // Pulse the active circle on stage change
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: motion.micro,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: motion.stage,
        useNativeDriver: true,
      }),
    ]).start();
  }, [status]);

  return (
    <View style={pstep.wrap}>
      <View style={pstep.row}>
        {PIPELINE_STAGES.map((stage, idx) => {
          const done     = idx < currentIdx;
          const active   = idx === currentIdx;
          const stageCfg = STAGE_CONFIG[stage.value];

          const circleBaseStyle = [
            pstep.circle,
            done   && pstep.circleDone,
            active && { backgroundColor: stageCfg.color } as object,
          ];

          return (
            <React.Fragment key={stage.value}>
              {idx > 0 && (
                <View style={[pstep.connector, done && pstep.connectorActive]} />
              )}
              <TouchableOpacity
                style={pstep.stage}
                onPress={() => onChange(stage.value)}
                activeOpacity={0.75}
              >
                {active ? (
                  <Animated.View style={[...circleBaseStyle, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={[pstep.circleText, pstep.circleTextActive]}>
                      {String(idx + 1)}
                    </Text>
                  </Animated.View>
                ) : (
                  <View style={circleBaseStyle}>
                    <Text style={[pstep.circleText, (done || active) && pstep.circleTextActive]}>
                      {done ? '✓' : String(idx + 1)}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    pstep.label,
                    done   && pstep.labelDone,
                    active && { color: stageCfg.color, fontWeight: '800' as const },
                  ]}
                  numberOfLines={1}
                >
                  {stage.short}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      {showHint && (
        <View style={[pstep.hint, { backgroundColor: cfg.bg }]}>
          <Text style={[pstep.hintText, { color: cfg.color }]}>
            {STAGE_HINTS[status] ?? ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const pstep = StyleSheet.create({
  wrap:             { marginBottom: 16 },
  row:              { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stage:            { alignItems: 'center', gap: 5 },
  connector:        { flex: 1, height: 2, backgroundColor: '#E8E4F0', marginTop: 13 },
  connectorActive:  { backgroundColor: colors.primary },
  circle:           { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDEAE4', alignItems: 'center', justifyContent: 'center' },
  circleDone:       { backgroundColor: colors.primary },
  circleText:       { ...typography.status, color: '#9A97A6' },
  circleTextActive: { color: '#fff' },
  label:            { fontSize: 9, fontWeight: '600', color: '#C4C4C4', textAlign: 'center', maxWidth: 40 },
  labelDone:        { color: '#9A97A6' },
  hint:             { borderRadius: 12, padding: 10 },
  hintText:         { ...typography.hint, textAlign: 'center' },
});
