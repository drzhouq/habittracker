# Habit Tracker Style System

This folder contains the centralized style system for the Habit Tracker application. The goal is to maintain consistent styling across components and make debugging easier by avoiding inline styles.

## Structure

- **`index.ts`**: Exports all style objects from the other files for easy imports
- **`theme.ts`**: Contains theme variables like colors, font sizes, spacing, and border radiuses
- **`calendarStyles.ts`**: Styles for Calendar component
- **`rewardStyles.ts`**: Styles for RewardsSection and related components
- **`habitStyles.ts`**: Styles for HabitTracker component

## Usage

Import styles from the centralized style system:

```tsx
import { themeColors, rewardStyles, calendarStyles, habitStyles } from '../styles';

// Use in a component
<div style={rewardStyles.creditText}>...</div>
```

## Style Objects

Each style file exports Record<string, CSSProperties> objects that can be applied directly to React components.

## Benefits

- **Consistency**: Use the same styles across different components
- **Maintainability**: Change styles in one place and have it reflected everywhere
- **Debugging**: Easier to debug styling issues with named style objects
- **Type Safety**: All styles are properly typed with React's CSSProperties

## Theme Colors

The main color palette is defined in `theme.ts` and includes:

- **Primary Colors**: Main brand colors
- **Text Colors**: For different text elements
- **Success/Error States**: Colors for success and error states
- **Accent Colors**: For highlights and special elements

## Adding New Styles

When adding new styles:

1. Determine if it belongs in an existing style file or needs a new one
2. Create properly typed style objects with descriptive names
3. Export from the appropriate file
4. Update `index.ts` if adding a new file

## Best Practices

- Prefer the style system over inline styles
- Use Tailwind for layout and structure
- Use the style system for complex visual styling
- Keep component-specific styles in their respective style files
- Use theme variables for colors and spacing 