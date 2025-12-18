/**
 * Feedback Components Showcase
 */
import React, { useState } from 'react';
import { MockAppProvider } from '@leanmcp/ui/testing';
import { Alert, Progress, Skeleton, Card, CardHeader, CardContent, Button } from '@leanmcp/ui';

export function FeedbackShowcase({ theme }: { theme: 'light' | 'dark' }) {
    const [progress, setProgress] = useState(45);

    return (
        <MockAppProvider toolResult={{ showcase: 'feedback' }} hostContext={{ theme }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Card>
                    <CardHeader title="Alert Variants" description="Info, success, warning, and error alerts" />
                    <CardContent>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Alert variant="info" title="Info">Informational message</Alert>
                            <Alert variant="success" title="Success">Operation completed</Alert>
                            <Alert variant="warning" title="Warning">Please review</Alert>
                            <Alert variant="error" title="Error">Something failed</Alert>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader title="Progress" description="Determinate and indeterminate progress bars" />
                    <CardContent>
                        <p>Progress: {progress}%</p>
                        <Progress value={progress} />
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                            <Button onClick={() => setProgress(Math.max(0, progress - 10))}>-10</Button>
                            <Button onClick={() => setProgress(Math.min(100, progress + 10))}>+10</Button>
                        </div>
                        <p style={{ marginTop: '16px' }}>Indeterminate:</p>
                        <Progress indeterminate />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader title="Skeleton" description="Loading placeholders with shimmer effect" />
                    <CardContent>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <Skeleton width={48} height={48} circle />
                            <div>
                                <Skeleton width={120} height={16} />
                                <Skeleton width={80} height={12} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MockAppProvider>
    );
}
