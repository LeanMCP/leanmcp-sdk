/**
 * Tabs component
 */
import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { clsx } from 'clsx';
import './Tabs.css';

export interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  /** Tab items */
  tabs: TabItem[];
  /** Default active tab (uncontrolled) */
  defaultValue?: string;
  /** Active tab value (controlled) */
  value?: string;
  /** Change handler */
  onValueChange?: (value: string) => void;
  /** Children (tab content) */
  children?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

export interface TabContentProps {
  /** Tab value this content belongs to */
  value: string;
  /** Children */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
}

export function Tabs({ tabs, defaultValue, value, onValueChange, children, className }: TabsProps) {
  const defaultTab = defaultValue || tabs[0]?.value;

  return (
    <TabsPrimitive.Root
      className={clsx('lui-tabs', className)}
      defaultValue={defaultTab}
      value={value}
      onValueChange={onValueChange}
    >
      <TabsPrimitive.List className="lui-tabs-list">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className="lui-tabs-trigger"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabContent({ value, children, className }: TabContentProps) {
  return (
    <TabsPrimitive.Content value={value} className={clsx('lui-tabs-content', className)}>
      {children}
    </TabsPrimitive.Content>
  );
}
