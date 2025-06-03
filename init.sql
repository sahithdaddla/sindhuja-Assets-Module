
CREATE TABLE asset_requests (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(7) NOT NULL,
    employee_name VARCHAR(60) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    other_asset VARCHAR(50),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT valid_employee_id CHECK (employee_id ~ '^ATS0(?!000)[0-9]{3}$'),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT valid_asset_type CHECK (
        asset_type IN ('laptop', 'desktop', 'mouse', 'keyboard', 'laptopbag', 'other')
    )
);


CREATE INDEX idx_employee_id ON asset_requests(employee_id);
CREATE INDEX idx_status ON asset_requests(status);
CREATE INDEX idx_request_date ON asset_requests(request_date);
