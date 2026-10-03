import React from 'react';
import Campaigns from './Campaigns';

// Re-exporting Campaigns to ensure backwards compatibility with /projects route
export default function Projects() {
  return <Campaigns />;
}
