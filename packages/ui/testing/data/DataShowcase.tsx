/**
 * Data Components Showcase
 */
import React from 'react';
import { MockAppProvider } from '@leanmcp/ui/testing';
import { DataGrid, Chart, Card, CardHeader, CardContent } from '../../src';

const tableData = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Senior Developer',
    department: 'Engineering',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Bob Williams',
    email: 'bob@example.com',
    role: 'UI Designer',
    department: 'Design',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Carol Smith',
    email: 'carol@example.com',
    role: 'Product Manager',
    department: 'Product',
    status: 'Active',
  },
  {
    id: 4,
    name: 'David Brown',
    email: 'david@example.com',
    role: 'DevOps Engineer',
    department: 'Engineering',
    status: 'Away',
  },
  {
    id: 5,
    name: 'Emma Davis',
    email: 'emma@example.com',
    role: 'QA Lead',
    department: 'Engineering',
    status: 'Active',
  },
  {
    id: 6,
    name: 'Frank Miller',
    email: 'frank@example.com',
    role: 'UX Researcher',
    department: 'Design',
    status: 'Offline',
  },
  {
    id: 7,
    name: 'Grace Wilson',
    email: 'grace@example.com',
    role: 'Frontend Developer',
    department: 'Engineering',
    status: 'Active',
  },
  {
    id: 8,
    name: 'Henry Taylor',
    email: 'henry@example.com',
    role: 'Backend Developer',
    department: 'Engineering',
    status: 'Active',
  },
];

const chartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [
    { label: 'Revenue', data: [12000, 19000, 15000, 25000, 22000], borderColor: '#3b82f6' },
  ],
};

export function DataShowcase({ theme }: { theme: 'light' | 'dark' }) {
  const chartRef = React.useRef<any>(null);
  const [clickedPoint, setClickedPoint] = React.useState<string | null>(null);

  const handleChartClick = (event: any, elements: any[]) => {
    console.log('Chart clicked!', { event, elements });
    if (elements && elements.length > 0) {
      const index = elements[0].index;
      const label = chartData.labels[index];
      const value = chartData.datasets[0].data[index];
      console.log('Selected point:', { index, label, value });
      setClickedPoint(`${label}: $${value.toLocaleString()}`);
    } else {
      console.log('No elements clicked');
      setClickedPoint(null);
    }
  };

  return (
    <MockAppProvider toolResult={{ showcase: 'data' }} hostContext={{ theme }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card>
          <CardHeader title="DataGrid" description="Sortable table with column definitions" />
          <CardContent>
            <DataGrid
              data={tableData}
              columns={[
                { key: 'name', header: 'Name' },
                { key: 'email', header: 'Email' },
                { key: 'role', header: 'Role' },
                { key: 'department', header: 'Department' },
                { key: 'status', header: 'Status' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Chart"
            description="Interactive Chart: Zoom (wheel/pinch), Pan (drag), Click points"
          />
          <CardContent>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => chartRef.current?.resetZoom()}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Reset Zoom
              </button>
            </div>
            <div style={{ height: '250px', position: 'relative', zIndex: 1 }}>
              <Chart ref={chartRef} type="line" data={chartData} onClick={handleChartClick} />
            </div>
            {clickedPoint && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  color: '#1e40af',
                  fontSize: '14px',
                  position: 'relative',
                  zIndex: 2,
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                Selected: <strong>{clickedPoint}</strong>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MockAppProvider>
  );
}
