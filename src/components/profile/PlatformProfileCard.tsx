import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { palette, radii, spacing } from '@/constants/tokens';
import { getPlatformCardMode } from '@/src/lib/creator-profile-aggregate';
import type { CreatorPlatformProfile, PresetPlatformKey } from '@/src/types/creator-profile';

import { PlatformProfileDisplayFace } from './PlatformProfileDisplayFace';
import { PlatformProfileInputFace } from './PlatformProfileInputFace';

type Props = {
  platform: PresetPlatformKey;
  slot: CreatorPlatformProfile;
  isEditing: boolean;
  profileUrl: string;
  resolving: boolean;
  refreshing: boolean;
  error: string | null;
  canResolve: boolean;
  testIdPrefix: string;
  onChangeUrl: (value: string) => void;
  onResolve: () => void;
  onEdit: () => void;
  onRefresh: () => void;
};

export function PlatformProfileCard({
  platform,
  slot,
  isEditing,
  profileUrl,
  resolving,
  refreshing,
  error,
  canResolve,
  testIdPrefix,
  onChangeUrl,
  onResolve,
  onEdit,
  onRefresh,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const mode = getPlatformCardMode(slot, isEditing);

  return (
    <View
      style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}
      testID={`${testIdPrefix}-card-${platform}`}>
      {mode === 'input' ? (
          <PlatformProfileInputFace
            platform={platform}
            profileUrl={profileUrl}
            resolving={resolving}
            error={error}
            canResolve={canResolve}
            testIdPrefix={testIdPrefix}
            onChangeUrl={onChangeUrl}
            onResolve={onResolve}
          />
        ) : (
          <PlatformProfileDisplayFace
            platform={platform}
            slot={slot}
            testIdPrefix={testIdPrefix}
            onEdit={onEdit}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
});
