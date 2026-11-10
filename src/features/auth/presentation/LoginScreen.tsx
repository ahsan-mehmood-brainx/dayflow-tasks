import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEMO_ACCOUNT } from '@/config/demoAccount';
import { colors, radii, screenGutter, spacing } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { IconButton } from '@/shared/ui/IconButton';
import { TextField } from '@/shared/ui/TextField';

import { useLoginForm } from './useLoginForm';

export function LoginScreen() {
  const { values, errors, bannerError, isSigningIn, setField, fill, submit } = useLoginForm();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Icon name="checkmark-circle" size={30} color={colors.textOnAccent} />
            </View>
            <AppText variant="largeTitle" accessibilityRole="header">
              DayFlow
            </AppText>
            <AppText variant="body" tone="secondary">
              Plan your day. Keep the flow.
            </AppText>
          </View>

          <View style={styles.form}>
            {bannerError ? <Banner tone="error" title="Couldn’t sign in" message={bannerError.message} /> : null}

            <TextField
              label="Email"
              required
              value={values.email}
              onChangeText={(text) => setField('email', text)}
              error={errors.email}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextField
              ref={passwordRef}
              label="Password"
              required
              value={values.password}
              onChangeText={(text) => setField('password', text)}
              error={errors.password}
              placeholder="Your password"
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              trailing={
                <IconButton
                  icon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                  accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                  onPress={() => setPasswordVisible((visible) => !visible)}
                />
              }
            />

            <Button label="Sign in" onPress={submit} loading={isSigningIn} />
          </View>

          <View style={styles.demo}>
            <View style={styles.demoHeader}>
              <Icon name="information-circle-outline" color={colors.accent} />
              <AppText variant="bodyStrong">Demo account</AppText>
            </View>
            <AppText variant="callout" tone="secondary">
              Sign-in is simulated for this training project and provides no real security. Use {DEMO_ACCOUNT.email} with
              the password “{DEMO_ACCOUNT.password}”.
            </AppText>
            <Button
              label="Use demo account"
              variant="ghost"
              size="compact"
              onPress={() => fill({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })}
              style={styles.demoButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xxxl,
    paddingHorizontal: screenGutter,
    paddingVertical: spacing.xxxl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  brand: {
    gap: spacing.sm,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  demo: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  demoButton: {
    alignSelf: 'flex-start',
    marginLeft: -spacing.lg + spacing.xs,
  },
});
