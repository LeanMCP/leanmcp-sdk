/**
 * Form Components Showcase
 */
import React, { useState } from 'react';
import { MockAppProvider } from '@leanmcp/ui/testing';
import { Select, Checkbox, Slider, Card, CardHeader, CardContent, Button } from '@leanmcp/ui';

export function FormShowcase({ theme }: { theme: 'light' | 'dark' }) {
  const [selectValue, setSelectValue] = useState('option1');
  const [checked, setChecked] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);

  return (
    <MockAppProvider toolResult={{ showcase: 'forms' }} hostContext={{ theme }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card>
          <CardHeader title="Select Component" description="Dropdown select with options" />
          <CardContent>
            <Select
              value={selectValue}
              onChange={setSelectValue}
              options={[
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
              ]}
            />
            <p style={{ marginTop: '8px', fontSize: '14px' }}>Selected: {selectValue}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Checkbox Component" description="Toggle checkboxes with labels" />
          <CardContent>
            <Checkbox label="Accept terms" checked={checked} onCheckedChange={setChecked} />
            <Checkbox label="Subscribe" defaultChecked />
            <Checkbox label="Disabled" disabled />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Slider Component" description="Range slider with value display" />
          <CardContent>
            <p>Volume: {sliderValue[0]}%</p>
            <Slider value={sliderValue} onValueChange={setSliderValue} />
          </CardContent>
        </Card>
      </div>
    </MockAppProvider>
  );
}
