/**
 * Layout Components Showcase
 */
import React, { useState } from 'react';
import { MockAppProvider } from '@leanmcp/ui/testing';
import { Tabs, TabContent, Modal, Card, CardHeader, CardContent, Button, Input } from '@leanmcp/ui';

export function LayoutShowcase({ theme }: { theme: 'light' | 'dark' }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('tab1');

    return (
        <MockAppProvider toolResult={{ showcase: 'layout' }} hostContext={{ theme }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <Card>
                    <CardHeader title="Tabs" description="Tabbed content navigation" />
                    <CardContent>
                        <Tabs
                            tabs={[
                                { value: 'tab1', label: 'Overview' },
                                { value: 'tab2', label: 'Details' },
                                { value: 'tab3', label: 'Settings' },
                            ]}
                            value={activeTab}
                            onValueChange={setActiveTab}
                        >
                            <TabContent value="tab1">Overview content here</TabContent>
                            <TabContent value="tab2">Details content here</TabContent>
                            <TabContent value="tab3">Settings content here</TabContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader title="Modal" description="Dialog overlay with form example" />
                    <CardContent>
                        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
                        <Modal
                            open={modalOpen}
                            onOpenChange={setModalOpen}
                            title="Edit Profile"
                            description="Update your profile information."
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                <Input placeholder="Your name" />
                                <Input type="email" placeholder="your@email.com" />
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                                    <Button onClick={() => setModalOpen(false)}>Save</Button>
                                </div>
                            </div>
                        </Modal>
                    </CardContent>
                </Card>
            </div>
        </MockAppProvider>
    );
}
