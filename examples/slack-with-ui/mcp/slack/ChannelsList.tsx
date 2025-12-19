import React from 'react';
import { ToolDataGrid, RequireConnection } from '@leanmcp/ui';

export function ChannelsList() {
  return (
    <RequireConnection loading={<div>Loading...</div>}>
      <div style={{ padding: '20px' }}>
        <h1>Slack Channels</h1>
        <ToolDataGrid
          toolName="listChannels"
          dataPath="channels"
          columns={[
            { field: 'name', headerName: 'Channel Name', width: 200 },
            { field: 'is_private', headerName: 'Private', width: 100 },
            { field: 'is_member', headerName: 'Member', width: 100 },
            { field: 'num_members', headerName: 'Members', width: 100 },
            { field: 'topic', headerName: 'Topic', width: 300 },
            { field: 'purpose', headerName: 'Purpose', width: 300 },
          ]}
          autoRefresh={30000}
        />
      </div>
    </RequireConnection>
  );
}