// ============================================================
// UserAvatar — shows Google/OAuth profile photo or initial fallback
// ============================================================

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors, FontWeight } from '@/constants/theme';

interface UserAvatarProps {
  /** Display name — first char is used as initial fallback */
  name?: string;
  /** Google profile photo URL (user_metadata.avatar_url / picture) */
  avatarUrl?: string | null;
  /** Diameter in pixels (default 40) */
  size?: number;
  /** Optional border ring color */
  borderColor?: string;
}

export function UserAvatar({
  name = 'U',
  avatarUrl,
  size = 40,
  borderColor,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = !!avatarUrl && !imageError;
  const initial = (name || 'U').charAt(0).toUpperCase();
  const radius = size / 2;

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    ...(borderColor ? { borderWidth: 2, borderColor } : {}),
  };

  return (
    <View testID="avatar-container" style={[styles.container, containerStyle]}>
      {showImage ? (
        <Image
          source={{ uri: avatarUrl! }}
          style={{ width: size, height: size, borderRadius: radius }}
          onError={() => setImageError(true)}
        />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.38 }]}>
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initial: {
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});
