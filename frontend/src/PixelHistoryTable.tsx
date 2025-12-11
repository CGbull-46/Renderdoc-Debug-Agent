import React from 'react';

export interface PixelMod {
  eventId: number;
  color: [number, number, number, number];
  shader?: string;
}

interface Props {
  history: PixelMod[];
}

const PixelHistoryTable = ({ history }: Props) => (
  <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        <th>Event ID</th>
        <th>Color (RGBA)</th>
        <th>Shader</th>
      </tr>
    </thead>
    <tbody>
      {history.map((mod, idx) => (
        <tr key={idx}>
          <td>{mod.eventId}</td>
          <td>{mod.color.join(', ')}</td>
          <td>{mod.shader ?? '-'}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default PixelHistoryTable;
