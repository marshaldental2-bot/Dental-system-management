/* eslint-disable */
import React, { useState } from 'react';
import { dentalLabService } from '../services/dentalLabService';
import './WorkOrdersTable.css';

/**
 * RevisionStatusBadge
 * Shows current / historical revision info for a work order.
 * States:
 *  - Active revision (status === 'revision_in_progress')
 *  - Returned (status === 'returned')
 *  - Completed but has past revisions (revision_count > 0)
 * Clicking opens a lightweight modal with full revision history.
 */
const RevisionStatusBadge = ({ order, formatDate }) => {
	const [showHistory, setShowHistory] = useState(false);
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const hasPastRevisions = (order?.revision_count || 0) > 0;
	const isActiveRevision = order?.status === 'revision_in_progress';
	const isReturned = order?.status === 'returned';

	// Decide compact label & color (neutral unless active/returned)
	let badgeText = null;
	let badgeClass = 'badge';
	if (isActiveRevision) {
		badgeText = `Rev ${order.revision_count || ''}`;
		badgeClass = 'badge bg-info text-dark';
	} else if (isReturned) {
		badgeText = `Returned${order.revision_count ? ' • Rev ' + order.revision_count : ''}`;
		badgeClass = 'badge bg-warning text-dark';
	} else if (hasPastRevisions) {
		badgeText = `Rev×${order.revision_count}`;
		badgeClass = 'badge bg-light border text-muted';
	}

	const openHistory = (e) => {
		e.stopPropagation();
		if (!order?.id) return;
		const evt = new CustomEvent('openRevisionHistory', { detail: { workOrder: order } });
		window.dispatchEvent(evt);
	};

	if (!badgeText) return null;

	return (
		<>
			<span
				className={`${badgeClass} ms-1 small`}
				style={{ cursor: 'pointer', fontWeight: 500, letterSpacing: '.5px' }}
				title={isActiveRevision ? 'Revision in progress – click for full history' : 'Click for revision history'}
				onClick={openHistory}
			>
				🔄 {badgeText}
			</span>

			{/* Global panel handled by RevisionPanelManager */}
		</>
	);
};

export default RevisionStatusBadge;
