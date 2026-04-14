import React, { useState, useEffect } from 'react';
import './App.css';

// Types
type JobStatus = 'ready' | 'at-risk' | 'blocked' | 'completed';

interface Job {
  id: string;
  address: string;
  customerName: string;
  status: JobStatus;
  installDate: string;
}

// Backend API URL
const API_URL = 'https://roofready-production.up.railway.app';

const App: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([
    { id: '1', address: '123 Main St', customerName: 'John Smith', status: 'ready', installDate: '2024-04-15' },
    { id: '2', address: '456 Oak Ave', customerName: 'Sarah Johnson', status: 'at-risk', installDate: '2024-04-16' },
    { id: '3', address: '789 Pine Rd', customerName: 'Mike Wilson', status: 'blocked', installDate: '2024-04-17' },
    { id: '4', address: '321 Elm Blvd', customerName: 'Lisa Brown', status: 'completed', installDate: '2024-04-14' }
  ]);
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  
  // Check backend API connection
  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then(response => response.json())
      .then(data => {
        setApiStatus(`✅ Connected to ${API_URL}`);
        console.log('Backend API:', data);
      })
      .catch(error => {
        setApiStatus(`❌ Cannot connect to backend`);
        console.error('API Error:', error);
      });
  }, []);

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'ready':
        return <span className="status-badge-ready">Ready</span>;
      case 'at-risk':
        return <span className="status-badge-at-risk">At Risk</span>;
      case 'blocked':
        return <span className="status-badge-blocked">Blocked</span>;
      case 'completed':
        return <span className="status-badge-completed">Completed</span>;
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '20px'
    },
    header: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#111827',
      margin: 0
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280',
      margin: '5px 0 0 0'
    },
    jobBoard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const
    },
    th: {
      backgroundColor: '#f9fafb',
      padding: '12px 16px',
      textAlign: 'left' as const,
      fontSize: '12px',
      fontWeight: '600',
      color: '#6b7280',
      textTransform: 'uppercase' as const,
      borderBottom: '1px solid #e5e7eb'
    },
    td: {
      padding: '16px',
      borderBottom: '1px solid #e5e7eb'
    },
    addButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>RoofReady</h1>
        <p style={styles.subtitle}>Job Readiness System for Roofing Companies</p>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '8px', borderRadius: '4px' }}>
          {apiStatus}
        </div>
      </header>

      {/* Job Board */}
      <div style={styles.jobBoard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Address</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Install Date</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td style={styles.td}>{job.address}</td>
                <td style={styles.td}>{job.customerName}</td>
                <td style={styles.td}>{getStatusBadge(job.status)}</td>
                <td style={styles.td}>{job.installDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Showing {jobs.length} jobs
              </p>
            </div>
            <button style={styles.addButton}>
              + Add New Job
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ marginTop: '30px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
        <p>© 2024 RoofReady SaaS. Job readiness system for roofing companies.</p>
        <p>Ready to generate revenue? Start onboarding roofing companies today!</p>
      </footer>
    </div>
  );
};

export default App;