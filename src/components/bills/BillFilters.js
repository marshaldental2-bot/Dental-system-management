import React from 'react';

const BillFilters = ({ 
    filters, 
    onFilterChange, 
    onClearFilters 
}) => {
    return (
        <div className="card mb-4">
            <div className="card-header">
                <h6>🔍 Search & Filters</h6>
            </div>
            <div className="card-body">
                <div className="row">
                    <div className="col-md-2">
                        <label className="form-label">Start Date</label>
                        <input
                            type="date"
                            className="form-control"
                            name="startDate"
                            value={filters.startDate}
                            onChange={onFilterChange}
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">End Date</label>
                        <input
                            type="date"
                            className="form-control"
                            name="endDate"
                            value={filters.endDate}
                            onChange={onFilterChange}
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Status</label>
                        <select
                            className="form-control"
                            name="status"
                            value={filters.status}
                            onChange={onFilterChange}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending (No Price)</option>
                            <option value="priced">Priced</option>
                            <option value="printed">Printed</option>
                            <option value="sent">Sent</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Doctor</label>
                        <input
                            type="text"
                            className="form-control"
                            name="doctor"
                            value={filters.doctor}
                            onChange={onFilterChange}
                            placeholder="Doctor name..."
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Job Number</label>
                        <input
                            type="text"
                            className="form-control"
                            name="searchSerial"
                            value={filters.searchSerial}
                            onChange={onFilterChange}
                            placeholder="Serial number..."
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">&nbsp;</label>
                        <button
                            className="btn btn-outline-secondary w-100"
                            onClick={onClearFilters}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillFilters;
