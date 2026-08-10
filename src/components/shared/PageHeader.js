import React from 'react';
import { useNavigate } from 'react-router-dom';

const PageHeader = ({ 
    title, 
    backPath = null, 
    backLabel = "Back to Dashboard",
    actions = null 
}) => {
    const navigate = useNavigate();

    return (
        <div className="card-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 gap-md-0">
            <h4 className="mb-0">{title}</h4>
            <div className="action-buttons d-grid gap-2 d-md-flex">
                {actions && actions}
                {backPath && (
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => navigate(backPath)}
                    >
                        {backLabel}
                    </button>
                )}
            </div>
        </div>
    );
};

export default PageHeader;
