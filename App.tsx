import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync();

// Pretendard 전역 기본 폰트 — 폰트 로딩 전에 미리 설정
(Text as any).defaultProps ??= {};
(Text as any).defaultProps.style = [{ fontFamily: 'Pretendard-Regular' }];
(TextInput as any).defaultProps ??= {};
(TextInput as any).defaultProps.style = [{ fontFamily: 'Pretendard-Regular' }];

export default function App() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular':   require('./assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium':    require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold':  require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold':      require('./assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('./assets/fonts/Pretendard-ExtraBold.otf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}
