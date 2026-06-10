import { Text } from '@/components/Text';
import React, { useRef, useState } from 'react';
import {
  Animated, PanResponder, View, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from '../../constants/theme';

const { colors, space, typography } = theme;

const ITEM_H = 64;

interface Deal {
  id: string;
  brand: string;
  statusLabel: string;
  amount: number;
}

interface Props {
  ids: string[];
  dealMap: Record<string, Deal>;
  featuredOrder: string[];
  onReorder: (fromIdx: number, toIdx: number) => void;
  onToggle: (id: string) => void;
}

export function SortableList({ ids, dealMap, featuredOrder, onReorder, onToggle }: Props) {
  const [fromIdx, setFromIdx] = useState<number | null>(null);
  const [toIdx, setToIdx]     = useState<number | null>(null);
  const dragYAnim = useRef(new Animated.Value(0)).current;

  // Pan responders are stored in a ref and only recreated when order changes
  const responders = useRef<ReturnType<typeof PanResponder.create>[]>([]);
  const idsKeyRef  = useRef('');
  const idsKey = ids.join(',');

  if (idsKeyRef.current !== idsKey && fromIdx === null) {
    idsKeyRef.current = idsKey;
    responders.current = ids.map((_, i) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragYAnim.setValue(0);
          setFromIdx(i);
          setToIdx(i);
        },
        onPanResponderMove: (_, { dy }) => {
          dragYAnim.setValue(dy);
          setToIdx(Math.max(0, Math.min(ids.length - 1, i + Math.round(dy / ITEM_H))));
        },
        onPanResponderRelease: (_, { dy }) => {
          const dest = Math.max(0, Math.min(ids.length - 1, i + Math.round(dy / ITEM_H)));
          dragYAnim.setValue(0);
          setFromIdx(null);
          setToIdx(null);
          if (dest !== i) onReorder(i, dest);
        },
        onPanResponderTerminate: () => {
          dragYAnim.setValue(0);
          setFromIdx(null);
          setToIdx(null);
        },
      })
    );
  }

  return (
    <View style={{ height: ids.length * ITEM_H }}>
      {ids.map((id, i) => {
        const deal = dealMap[id];
        if (!deal) return null;

        const isActive = fromIdx === i;
        const isOn = featuredOrder.length === 0 || featuredOrder.includes(id);

        // Non-active items shift to visually fill the dragged item's original gap
        let shift = 0;
        if (fromIdx !== null && toIdx !== null && !isActive) {
          if (fromIdx < i && toIdx >= i) shift = -ITEM_H;
          else if (fromIdx > i && toIdx <= i) shift = ITEM_H;
        }

        const handlers = responders.current[i]?.panHandlers ?? {};

        return (
          <Animated.View
            key={id}
            style={[
              sl.item,
              { top: i * ITEM_H },
              isActive
                ? { transform: [{ translateY: dragYAnim }], zIndex: 10, backgroundColor: '#EEEEFF', borderRadius: 10, opacity: 0.96 }
                : { transform: [{ translateY: shift }] },
            ]}
          >
            <TouchableOpacity onPress={() => onToggle(id)} activeOpacity={0.7}>
              <View style={[sl.check, isOn && sl.checkOn]}>
                {isOn && <Text style={sl.checkMark}>✓</Text>}
              </View>
            </TouchableOpacity>

            <View style={sl.info}>
              <Text style={sl.brand}>{deal.brand}</Text>
              <Text style={sl.status}>{deal.statusLabel}</Text>
            </View>

            {deal.amount > 0 && (
              <Text style={sl.amount}>₩{(deal.amount / 10000).toFixed(0)}만</Text>
            )}

            <View style={sl.handle} {...handlers}>
              <Text style={sl.handleIcon}>☰</Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const sl = StyleSheet.create({
  item:       { position: 'absolute', left: 0, right: 0, height: ITEM_H, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  check:      { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center' },
  checkOn:    { backgroundColor: colors.brand.default, borderColor: colors.brand.default },
  checkMark:  { fontSize: 13, color: '#fff', fontWeight: '700' },
  info:       { flex: 1 },
  brand:      { ...typography.bodyStrong, color: colors.text.primary },
  status:     { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
  amount:     { ...typography.caption, color: colors.brand.default, fontWeight: '700' },
  handle:     { padding: 12 },
  handleIcon: { fontSize: 18, color: colors.text.muted },
});
