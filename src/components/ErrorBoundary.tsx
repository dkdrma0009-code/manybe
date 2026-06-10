import { Text } from '@/components/Text';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { makeLogger } from '../utils/logger';

const log = makeLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    log.error(error.message, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>앱 오류가 발생했어요</Text>
        <Text style={styles.body} numberOfLines={3}>
          {this.state.error?.message ?? '알 수 없는 오류'}
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ hasError: false, error: undefined })}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: '#F5F3EF',
  },
  icon:  { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 8, textAlign: 'center' },
  body:  { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn:   { backgroundColor: '#6E56F0', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
  btnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
