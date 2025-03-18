import { CSSProperties } from 'react';
import { themeColors } from './theme';

export const habitStyles: Record<string, CSSProperties> = {
  habitTitle: {
    color: themeColors.accentColor
  },
  
  creditText: {
    color: themeColors.textPrimary, 
    textShadow: '0 0 1px white'
  },
  
  completedBadge: {
    color: 'white',
    padding: '4px 12px',
    fontWeight: 'bold',
    fontSize: '0.875rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    textShadow: '0 1px 1px rgba(0,0,0,0.3)',
   // backgroundColor: themeColors.green
  },
  
  unclaimButton: {
    color: themeColors.textPrimary
  },
  
  claimButton: {
    color: 'white'
  }
}; 