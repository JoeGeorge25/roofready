// Simplified function to add job to board
function addJobToBoard(job) {
    console.log('SIMPLIFIED: Adding job to board:', job);
    
    try {
        // Format date
        const installDate = new Date(job.install_date);
        const formattedDate = installDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        // Calculate days
        const today = new Date();
        const timeDiff = installDate - today;
        const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        let daysText = `${daysUntil} days`;
        if (daysUntil === 0) daysText = 'Today';
        if (daysUntil === 1) daysText = 'Tomorrow';
        
        // Create row HTML
        const rowHTML = `
            <tr>
                <td>
                    <strong>${job.address}</strong><br>
                    <small>${job.customer_name}</small>
                </td>
                <td><strong>${formattedDate}</strong><br><small style="color: #6b7280;">${job.crew_assignment} • ${daysText}</small></td>
                <td><span class="status-badge status-at-risk">At Risk</span></td>
                <td>
                    <div class="readiness-factors">
                        <span class="factor factor-red" title="Assigned to: Office Manager">Materials</span>
                        <span class="factor factor-green" title="Assigned to: Field Supervisor">Crew ✓</span>
                        <span class="factor factor-yellow" title="Assigned to: Sales Rep">Customer</span>
                        <span class="factor factor-green" title="System monitored">Weather ✓</span>
                        <span class="factor factor-red" title="Assigned to: Office Manager">Permit</span>
                    </div>
                </td>
            </tr>
        `;
        
        // Get table by ID
        const table = document.getElementById('jobs-table');
        if (!table) {
            console.error('Table not found with id="jobs-table"');
            alert('Job created! (Table update failed)');
            return;
        }
        
        // Get tbody
        let tbody = table.querySelector('tbody');
        if (!tbody) {
            tbody = document.createElement('tbody');
            table.appendChild(tbody);
        }
        
        // Add row at top
        tbody.insertAdjacentHTML('afterbegin', rowHTML);
        
        // Highlight new row
        const newRow = tbody.querySelector('tr:first-child');
        if (newRow) {
            newRow.style.backgroundColor = '#f0f9ff';
            setTimeout(() => {
                newRow.style.backgroundColor = '';
            }, 2000);
        }
        
        console.log('SIMPLIFIED: Job added successfully!');
        
    } catch (error) {
        console.error('SIMPLIFIED: Error:', error);
        alert(`Job created but display error: ${error.message}`);
    }
}