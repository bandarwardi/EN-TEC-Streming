# TV Compatibility Rules

When modifying or creating new UI components in this workspace, ALWAYS prioritize TV remote accessibility:

1. **DO NOT** use standard <Pressable>, <TouchableOpacity>, or <TouchableWithoutFeedback> for interactive elements.
2. **ALWAYS** use the custom <TVFocusable> component located in @/components/TVFocusable. This component integrates properly with the Android TV and tvOS spatial navigation engines and handles scale animations and focus indicators.
3. If you need an absolute overlay to dismiss a modal or capture background taps, use <TVFocusable disableBorder /> or ensure it does not trap D-Pad focus by using ocusable={false} on standard views.
4. When rendering text inputs (<TextInput>), ensure they are wrapped inside <TVFocusable> or that they properly request focus so the user does not get trapped on a screen without the ability to navigate out.
