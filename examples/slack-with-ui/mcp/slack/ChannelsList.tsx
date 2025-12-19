import React from 'react';
import { ToolDataGrid, RequireConnection } from '@leanmcp/ui';

export function ChannelsList() {
  return (
    <RequireConnection loading={<div>Loading...</div>}>
      <div style={{ padding: '20px' }}>
        <h1>Slack Channels</h1>
        <ToolDataGrid
          dataTool="listChannels"
          transformData={(result: any) => ({
            rows: result.channels || [],
            total: (result.channels || []).length
          })}
          columns={[
            { key: 'name', header: 'Channel Name', width: '200px' },
            { key: 'is_private', header: 'Private', width: '100px' },
            { key: 'is_member', header: 'Member', width: '100px' },
            { key: 'num_members', header: 'Members', width: '100px' },
            { key: 'topic', header: 'Topic', width: '300px' },
            { key: 'purpose', header: 'Purpose', width: '300px' },
          ]}
          refreshInterval={30000}
        />
      </div>
    </RequireConnection>
  );
}