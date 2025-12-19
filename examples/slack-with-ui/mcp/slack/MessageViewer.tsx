import React, { useState } from 'react';
import { ToolDataGrid, RequireConnection, useTool } from '@leanmcp/ui';

export function MessageViewer() {
  const [channelId, setChannelId] = useState('');
  const [limit, setLimit] = useState(20);

  return (
    <RequireConnection loading={<div>Loading...</div>}>
      <div style={{ padding: '20px' }}>
        <h1>Slack Messages</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <label>
            Channel ID:
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="C1234567890"
              style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
            />
          </label>
          
          <label style={{ marginLeft: '20px' }}>
            Limit:
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 20)}
              min="1"
              max="100"
              style={{ marginLeft: '10px', padding: '5px', width: '80px' }}
            />
          </label>
        </div>

        {channelId && (
          <ToolDataGrid
            toolName="getMessages"
            toolArgs={{ channel: channelId, limit }}
            dataPath="messages"
            columns={[
              { field: 'ts', headerName: 'Timestamp', width: 150 },
              { field: 'user', headerName: 'User', width: 150 },
              { field: 'text', headerName: 'Message', width: 500 },
              { field: 'reply_count', headerName: 'Replies', width: 100 },
            ]}
            autoRefresh={10000}
          />
        )}
      </div>
    </RequireConnection>
  );
}