import React from 'react';

interface Props {
  thoughts: string[];
}

const ThoughtChain = ({ thoughts }: Props) => (
  <div style={{ marginTop: 16 }}>
    <h3>思维链</h3>
    <ol>
      {thoughts.map((t, idx) => (
        <li key={idx}>{t}</li>
      ))}
    </ol>
  </div>
);

export default ThoughtChain;
