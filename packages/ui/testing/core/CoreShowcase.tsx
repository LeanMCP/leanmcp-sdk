/**
 * Core Components Showcase
 */
import React, { useState } from 'react';
import { MockAppProvider } from '@leanmcp/ui/testing';
import { Card, CardHeader, CardContent, CardFooter, Button, Input } from '@leanmcp/ui';

export function CoreShowcase({ theme }: { theme: 'light' | 'dark' }) {
    const [inputValue, setInputValue] = useState('');

    return (
        <MockAppProvider toolResult={{ showcase: 'core' }} hostContext={{ theme }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Card>
                    <CardHeader title="Button Variants" description="Primary, secondary, outline, ghost, and destructive styles" />
                    <CardContent>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <Button>Primary</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="destructive">Destructive</Button>
                            <Button disabled>Disabled</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader title="Input" description="Text input with different states" />
                    <CardContent>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px' }}>
                            <Input placeholder="Default" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
                            <Input type="password" placeholder="Password" />
                            <Input disabled placeholder="Disabled" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader title="Card with Footer" description="Card layout with header, content, and footer" />
                    <CardContent>Card content goes here.</CardContent>
                    <CardFooter>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
                            <Button variant="secondary">Cancel</Button>
                            <Button>Confirm</Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </MockAppProvider>
    );
}
