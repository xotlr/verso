import {
  CallsheetData,
  CallsheetScene,
  CastCall,
  CrewMember,
  CallsheetLocation,
  MealInfo,
  EmergencyContact,
  CREW_DEPARTMENT_LABELS,
  MEAL_TYPE_LABELS,
} from '@/types/callsheet';

interface CallsheetForExport {
  id: string;
  title: string;
  shootDate: Date;
  callTime: Date;
  wrapTime?: Date | null;
  status: string;
  primaryLocation?: string | null;
  data?: CallsheetData | null;
  weatherForecast?: string | null;
  weatherTemp?: number | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeOnly(time: string): string {
  // For times stored as just HH:MM strings
  if (time.includes(':') && !time.includes('T')) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }
  return formatTime(time);
}

export function generateCallsheetHTML(callsheet: CallsheetForExport, forPrint: boolean = false): string {
  const data = callsheet.data;
  const productionTitle = data?.productionTitle || callsheet.project?.name || callsheet.title;
  const shootDay = data?.shootDay || 1;
  const totalDays = data?.totalShootDays;

  const printStyles = forPrint ? `
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(callsheet.title)} - Callsheet</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      background: #fff;
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      color: white;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    .header .subtitle { opacity: 0.9; font-size: 16px; }
    .header .shoot-day {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 12px;
      font-weight: 600;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
    }
    .info-card h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 8px;
    }
    .info-card .value { font-size: 18px; font-weight: 600; color: #1e293b; }
    .info-card .secondary { font-size: 14px; color: #64748b; margin-top: 4px; }
    .section {
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .section-header {
      background: #f1f5f9;
      padding: 12px 16px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }
    .section-content { padding: 16px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th {
      text-align: left;
      font-weight: 600;
      color: #475569;
      padding: 8px 12px;
      background: #f8fafc;
      border-bottom: 2px solid #e2e8f0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    .call-time {
      font-weight: 600;
      color: #1e40af;
      white-space: nowrap;
    }
    .scene-number {
      font-weight: 700;
      background: #1e40af;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
      font-size: 12px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-in-progress { background: #dbeafe; color: #1e40af; }
    .status-completed { background: #dcfce7; color: #166534; }
    .emergency {
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .emergency h3 {
      color: #dc2626;
      font-size: 14px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .emergency-contact {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #fecaca;
    }
    .emergency-contact:last-child { border-bottom: none; }
    .notes {
      background: #fefce8;
      border: 1px solid #fef08a;
      padding: 16px;
      border-radius: 8px;
      font-size: 14px;
    }
    .notes h3 { color: #854d0e; margin-bottom: 8px; font-size: 13px; text-transform: uppercase; }
    .weather {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .weather-temp {
      font-size: 32px;
      font-weight: 700;
      color: #1e40af;
    }
    .weather-details { font-size: 14px; color: #64748b; }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    }
    ${printStyles}
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>${escapeHtml(productionTitle)}</h1>
    <div class="subtitle">${formatDate(callsheet.shootDate)}</div>
    <div class="shoot-day">DAY ${shootDay}${totalDays ? ` OF ${totalDays}` : ''}</div>
  </div>

  <!-- Call Times & Weather Grid -->
  <div class="info-grid">
    <div class="info-card">
      <h3>General Call</h3>
      <div class="value">${formatTime(callsheet.callTime)}</div>
      ${data?.firstShotTime ? `<div class="secondary">First Shot: ${formatTimeOnly(data.firstShotTime)}</div>` : ''}
    </div>
    ${callsheet.wrapTime || data?.estimatedWrap ? `
    <div class="info-card">
      <h3>Estimated Wrap</h3>
      <div class="value">${callsheet.wrapTime ? formatTime(callsheet.wrapTime) : formatTimeOnly(data?.estimatedWrap || '')}</div>
    </div>
    ` : ''}
    ${callsheet.primaryLocation || (data?.locations && data.locations.length > 0) ? `
    <div class="info-card">
      <h3>Primary Location</h3>
      <div class="value">${escapeHtml(callsheet.primaryLocation || data?.locations?.[0]?.name || '')}</div>
      ${data?.locations?.[0]?.address ? `<div class="secondary">${escapeHtml(data.locations[0].address)}</div>` : ''}
    </div>
    ` : ''}
    ${callsheet.weatherForecast || data?.weather ? `
    <div class="info-card">
      <h3>Weather</h3>
      <div class="weather">
        ${callsheet.weatherTemp || data?.weather?.high ? `
        <div class="weather-temp">${Math.round(callsheet.weatherTemp || data?.weather?.high || 0)}°</div>
        ` : ''}
        <div class="weather-details">
          ${escapeHtml(callsheet.weatherForecast || data?.weather?.forecast || '')}
          ${data?.weather?.sunrise && data?.weather?.sunset ? `<br>Sunrise: ${data.weather.sunrise} / Sunset: ${data.weather.sunset}` : ''}
        </div>
      </div>
    </div>
    ` : ''}
  </div>

  ${generateEmergencyContactsHTML(data?.emergencyContacts, data?.nearestHospital)}

  ${generateScenesHTML(data?.scenes)}

  ${generateCastCallsHTML(data?.castCalls)}

  ${generateCrewHTML(data?.crew)}

  ${generateMealsHTML(data?.meals)}

  ${generateLocationsHTML(data?.locations)}

  ${data?.productionNotes || data?.safetyNotes ? `
  <div class="notes">
    <h3>Notes</h3>
    ${data.productionNotes ? `<p style="margin-bottom: 8px;"><strong>Production:</strong> ${escapeHtml(data.productionNotes)}</p>` : ''}
    ${data.safetyNotes ? `<p><strong>Safety:</strong> ${escapeHtml(data.safetyNotes)}</p>` : ''}
  </div>
  ` : ''}

  <div class="footer">
    Generated by Verso Screenwriting Software
  </div>
</body>
</html>`;
}

function generateEmergencyContactsHTML(contacts?: EmergencyContact[], hospital?: { name: string; address: string; phone?: string }): string {
  if ((!contacts || contacts.length === 0) && !hospital) return '';

  return `
  <div class="emergency">
    <h3>Emergency Contacts</h3>
    ${contacts?.map(c => `
    <div class="emergency-contact">
      <div>
        <strong>${escapeHtml(c.name)}</strong>
        <span style="color: #64748b; margin-left: 8px;">${escapeHtml(c.role)}</span>
      </div>
      <div style="font-weight: 600;">${escapeHtml(c.phone)}</div>
    </div>
    `).join('') || ''}
    ${hospital ? `
    <div class="emergency-contact" style="background: #fee2e2; margin: 8px -16px -16px; padding: 12px 16px; border-radius: 0 0 8px 8px;">
      <div>
        <strong>Nearest Hospital:</strong> ${escapeHtml(hospital.name)}
        <div style="font-size: 13px; color: #64748b;">${escapeHtml(hospital.address)}</div>
      </div>
      ${hospital.phone ? `<div style="font-weight: 600;">${escapeHtml(hospital.phone)}</div>` : ''}
    </div>
    ` : ''}
  </div>`;
}

function generateScenesHTML(scenes?: CallsheetScene[]): string {
  if (!scenes || scenes.length === 0) return '';

  return `
  <div class="section">
    <div class="section-header">Scene Schedule</div>
    <table>
      <thead>
        <tr>
          <th>Scene</th>
          <th>Description</th>
          <th>Pages</th>
          <th>Cast</th>
          <th>Location</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${scenes.map(s => `
        <tr>
          <td><span class="scene-number">${escapeHtml(s.sceneNumber)}</span></td>
          <td>
            <div style="font-weight: 500;">${escapeHtml(s.heading)}</div>
            ${s.description ? `<div style="font-size: 13px; color: #64748b;">${escapeHtml(s.description)}</div>` : ''}
          </td>
          <td>${s.pageCount} (${s.eighths}/8)</td>
          <td style="font-size: 13px;">${s.cast.map(c => escapeHtml(c)).join(', ')}</td>
          <td>${escapeHtml(s.location || '-')}</td>
          <td><span class="status-badge status-${s.status}">${s.status.replace('-', ' ')}</span></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

function generateCastCallsHTML(castCalls?: CastCall[]): string {
  if (!castCalls || castCalls.length === 0) return '';

  return `
  <div class="section">
    <div class="section-header">Cast Calls</div>
    <table>
      <thead>
        <tr>
          <th>Call</th>
          <th>Character</th>
          <th>Actor</th>
          <th>Pickup</th>
          <th>Makeup</th>
          <th>On Set</th>
          <th>Scenes</th>
        </tr>
      </thead>
      <tbody>
        ${castCalls.map(c => `
        <tr>
          <td class="call-time">${formatTimeOnly(c.callTime)}</td>
          <td style="font-weight: 500;">${escapeHtml(c.characterName)}</td>
          <td>${escapeHtml(c.actorName || '-')}</td>
          <td>${c.pickupTime ? formatTimeOnly(c.pickupTime) : '-'}</td>
          <td>${c.makeupTime ? formatTimeOnly(c.makeupTime) : '-'}</td>
          <td>${c.onSetTime ? formatTimeOnly(c.onSetTime) : '-'}</td>
          <td style="font-size: 13px;">${c.scenes.join(', ')}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

function generateCrewHTML(crew?: CrewMember[]): string {
  if (!crew || crew.length === 0) return '';

  // Group by department
  const byDepartment = crew.reduce((acc, member) => {
    const dept = member.department;
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(member);
    return acc;
  }, {} as Record<string, CrewMember[]>);

  return `
  <div class="section">
    <div class="section-header">Crew Calls</div>
    <div class="section-content">
      ${Object.entries(byDepartment).map(([dept, members]) => `
      <div style="margin-bottom: 16px;">
        <h4 style="font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.03em;">
          ${CREW_DEPARTMENT_LABELS[dept as keyof typeof CREW_DEPARTMENT_LABELS] || dept}
        </h4>
        <table>
          <tbody>
            ${members.map(m => `
            <tr>
              <td class="call-time" style="width: 80px;">${formatTimeOnly(m.callTime)}</td>
              <td style="font-weight: 500;">${escapeHtml(m.name)}</td>
              <td style="color: #64748b;">${escapeHtml(m.role)}</td>
              <td style="text-align: right; color: #64748b;">${m.phone ? escapeHtml(m.phone) : ''}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `).join('')}
    </div>
  </div>`;
}

function generateMealsHTML(meals?: MealInfo[]): string {
  if (!meals || meals.length === 0) return '';

  return `
  <div class="section">
    <div class="section-header">Meals</div>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Meal</th>
          <th>Location</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${meals.map(m => `
        <tr>
          <td class="call-time">${formatTimeOnly(m.time)}</td>
          <td style="font-weight: 500;">${MEAL_TYPE_LABELS[m.type]}</td>
          <td>${escapeHtml(m.location || '-')}</td>
          <td style="color: #64748b;">${escapeHtml(m.notes || '-')}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

function generateLocationsHTML(locations?: CallsheetLocation[]): string {
  if (!locations || locations.length === 0) return '';

  return `
  <div class="section">
    <div class="section-header">Locations</div>
    <div class="section-content">
      ${locations.map(loc => `
      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <strong style="font-size: 15px;">${escapeHtml(loc.name)}</strong>
            <span style="background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; text-transform: uppercase;">
              ${loc.type}
            </span>
          </div>
          ${loc.mapUrl ? `<a href="${escapeHtml(loc.mapUrl)}" target="_blank" style="color: #2563eb; font-size: 13px;">View Map</a>` : ''}
        </div>
        ${loc.address ? `<div style="color: #64748b; margin-top: 4px;">${escapeHtml(loc.address)}${loc.city ? `, ${escapeHtml(loc.city)}` : ''}${loc.state ? `, ${escapeHtml(loc.state)}` : ''} ${escapeHtml(loc.zipCode || '')}</div>` : ''}
        ${loc.contactName || loc.contactPhone ? `<div style="margin-top: 8px; font-size: 13px;"><strong>Contact:</strong> ${escapeHtml(loc.contactName || '')} ${loc.contactPhone ? `- ${escapeHtml(loc.contactPhone)}` : ''}</div>` : ''}
        ${loc.parkingInstructions ? `<div style="margin-top: 4px; font-size: 13px; color: #64748b;"><strong>Parking:</strong> ${escapeHtml(loc.parkingInstructions)}</div>` : ''}
        ${loc.notes ? `<div style="margin-top: 4px; font-size: 13px; color: #64748b;">${escapeHtml(loc.notes)}</div>` : ''}
      </div>
      `).join('')}
    </div>
  </div>`;
}

export function generateCallsheetText(callsheet: CallsheetForExport): string {
  const data = callsheet.data;
  const productionTitle = data?.productionTitle || callsheet.project?.name || callsheet.title;
  const shootDay = data?.shootDay || 1;
  const totalDays = data?.totalShootDays;

  let text = `${'='.repeat(60)}
${productionTitle.toUpperCase()}
CALLSHEET - DAY ${shootDay}${totalDays ? ` OF ${totalDays}` : ''}
${formatDate(callsheet.shootDate)}
${'='.repeat(60)}

CALL TIMES
----------
General Call: ${formatTime(callsheet.callTime)}
${data?.firstShotTime ? `First Shot: ${formatTimeOnly(data.firstShotTime)}` : ''}
${callsheet.wrapTime ? `Est. Wrap: ${formatTime(callsheet.wrapTime)}` : data?.estimatedWrap ? `Est. Wrap: ${formatTimeOnly(data.estimatedWrap)}` : ''}

`;

  // Location
  if (callsheet.primaryLocation || data?.locations?.[0]) {
    const loc = data?.locations?.[0];
    text += `PRIMARY LOCATION
----------------
${callsheet.primaryLocation || loc?.name || ''}
${loc?.address ? loc.address : ''}
${loc?.city ? `${loc.city}, ${loc.state || ''} ${loc.zipCode || ''}` : ''}
${loc?.contactName ? `Contact: ${loc.contactName} ${loc.contactPhone || ''}` : ''}

`;
  }

  // Weather
  if (callsheet.weatherForecast || data?.weather) {
    text += `WEATHER
-------
${callsheet.weatherForecast || data?.weather?.forecast || ''}
${callsheet.weatherTemp ? `Temperature: ${Math.round(callsheet.weatherTemp)}°F` : ''}
${data?.weather?.sunrise ? `Sunrise: ${data.weather.sunrise}` : ''} ${data?.weather?.sunset ? `Sunset: ${data.weather.sunset}` : ''}

`;
  }

  // Emergency Contacts
  if (data?.emergencyContacts?.length || data?.nearestHospital) {
    text += `EMERGENCY CONTACTS
------------------
`;
    data?.emergencyContacts?.forEach(c => {
      text += `${c.name} (${c.role}): ${c.phone}
`;
    });
    if (data?.nearestHospital) {
      text += `
Nearest Hospital: ${data.nearestHospital.name}
${data.nearestHospital.address}
${data.nearestHospital.phone ? `Phone: ${data.nearestHospital.phone}` : ''}
`;
    }
    text += '\n';
  }

  // Scenes
  if (data?.scenes?.length) {
    text += `SCENE SCHEDULE
--------------
`;
    data.scenes.forEach(s => {
      text += `${s.sceneNumber.padEnd(8)} ${s.heading}
         Pages: ${s.pageCount} (${s.eighths}/8)  Cast: ${s.cast.join(', ')}
         ${s.location ? `Location: ${s.location}` : ''}
`;
    });
    text += '\n';
  }

  // Cast Calls
  if (data?.castCalls?.length) {
    text += `CAST CALLS
----------
`;
    data.castCalls.forEach(c => {
      text += `${formatTimeOnly(c.callTime).padEnd(10)} ${c.characterName}${c.actorName ? ` (${c.actorName})` : ''}
         Scenes: ${c.scenes.join(', ')}
${c.makeupTime ? `         Makeup: ${formatTimeOnly(c.makeupTime)}` : ''}${c.onSetTime ? `  On Set: ${formatTimeOnly(c.onSetTime)}` : ''}
`;
    });
    text += '\n';
  }

  // Crew
  if (data?.crew?.length) {
    text += `CREW CALLS
----------
`;
    const byDept = data.crew.reduce((acc, m) => {
      if (!acc[m.department]) acc[m.department] = [];
      acc[m.department].push(m);
      return acc;
    }, {} as Record<string, CrewMember[]>);

    Object.entries(byDept).forEach(([dept, members]) => {
      text += `
${(CREW_DEPARTMENT_LABELS[dept as keyof typeof CREW_DEPARTMENT_LABELS] || dept).toUpperCase()}
`;
      members.forEach(m => {
        text += `${formatTimeOnly(m.callTime).padEnd(10)} ${m.name} - ${m.role}${m.phone ? ` (${m.phone})` : ''}
`;
      });
    });
    text += '\n';
  }

  // Meals
  if (data?.meals?.length) {
    text += `MEALS
-----
`;
    data.meals.forEach(m => {
      text += `${formatTimeOnly(m.time).padEnd(10)} ${MEAL_TYPE_LABELS[m.type]}${m.location ? ` @ ${m.location}` : ''}
`;
    });
    text += '\n';
  }

  // Notes
  if (data?.productionNotes || data?.safetyNotes) {
    text += `NOTES
-----
`;
    if (data.productionNotes) text += `Production: ${data.productionNotes}\n`;
    if (data.safetyNotes) text += `Safety: ${data.safetyNotes}\n`;
  }

  text += `
${'='.repeat(60)}
Generated by Verso Screenwriting Software
`;

  return text;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
