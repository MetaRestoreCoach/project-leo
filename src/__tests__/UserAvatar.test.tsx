// ============================================================
// UserAvatar — component tests
// ============================================================

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { UserAvatar } from '@/components/common/UserAvatar';

jest.mock('@/constants/theme', () => ({
  Colors: { primary: '#4F46E5', white: '#FFFFFF' },
  FontWeight: { bold: '700' },
}));

function flatStyle(style: any): Record<string, unknown> {
  return StyleSheet.flatten(style) ?? {};
}

describe('UserAvatar', () => {
  // ── Initial fallback ───────────────────────────────────
  describe('initial fallback (no avatarUrl)', () => {
    it('renders the first uppercase letter of name', () => {
      const { getByText } = render(<UserAvatar name="Kiran" />);
      expect(getByText('K')).toBeTruthy();
    });

    it('falls back to "U" when name is empty', () => {
      const { getByText } = render(<UserAvatar name="" />);
      expect(getByText('U')).toBeTruthy();
    });

    it('falls back to "U" when name is undefined', () => {
      const { getByText } = render(<UserAvatar />);
      expect(getByText('U')).toBeTruthy();
    });

    it('uses uppercase of first character', () => {
      const { getByText } = render(<UserAvatar name="alex" />);
      expect(getByText('A')).toBeTruthy();
    });
  });

  // ── Image rendering ────────────────────────────────────
  describe('image rendering', () => {
    it('does not show initial when avatarUrl is provided', () => {
      const { queryByText } = render(
        <UserAvatar name="Kiran" avatarUrl="https://example.com/avatar.jpg" />,
      );
      expect(queryByText('K')).toBeNull();
    });

    it('shows initial fallback when image fails to load', () => {
      const { getByText, UNSAFE_getByType } = render(
        <UserAvatar name="Kiran" avatarUrl="https://example.com/bad.jpg" />,
      );
      const { Image } = require('react-native');
      const image = UNSAFE_getByType(Image);
      fireEvent(image, 'error');
      expect(getByText('K')).toBeTruthy();
    });

    it('shows initial when avatarUrl is null', () => {
      const { getByText } = render(<UserAvatar name="Test" avatarUrl={null} />);
      expect(getByText('T')).toBeTruthy();
    });
  });

  // ── Size prop ──────────────────────────────────────────
  describe('size prop', () => {
    it('defaults to 40px', () => {
      const { getByTestId } = render(<UserAvatar name="A" />);
      const style = flatStyle(getByTestId('avatar-container').props.style);
      expect(style.width).toBe(40);
      expect(style.height).toBe(40);
    });

    it('applies custom size', () => {
      const { getByTestId } = render(<UserAvatar name="A" size={80} />);
      const style = flatStyle(getByTestId('avatar-container').props.style);
      expect(style.width).toBe(80);
      expect(style.height).toBe(80);
    });

    it('sets borderRadius to size/2', () => {
      const { getByTestId } = render(<UserAvatar name="A" size={60} />);
      const style = flatStyle(getByTestId('avatar-container').props.style);
      expect(style.borderRadius).toBe(30);
    });
  });

  // ── Border ────────────────────────────────────────────
  describe('borderColor prop', () => {
    it('applies borderWidth and borderColor when borderColor is set', () => {
      const { getByTestId } = render(<UserAvatar name="A" borderColor="#FF0000" />);
      const style = flatStyle(getByTestId('avatar-container').props.style);
      expect(style.borderColor).toBe('#FF0000');
      expect(style.borderWidth).toBe(2);
    });

    it('does not apply border when borderColor is omitted', () => {
      const { getByTestId } = render(<UserAvatar name="A" />);
      const style = flatStyle(getByTestId('avatar-container').props.style);
      expect(style.borderWidth).toBeUndefined();
      expect(style.borderColor).toBeUndefined();
    });
  });
});
