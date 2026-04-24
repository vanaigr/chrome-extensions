const fs = require('fs');
const path = require('path');

const STATES = {
	'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
	'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
	'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
	'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
	'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME',
	'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
	'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
	'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
	'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
	'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI',
	'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX',
	'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
	'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
};

const input = fs.readFileSync(path.join(__dirname, 'cities.txt'), 'utf8');
const out = [];
for (const line of input.split('\n')) {
	const m = /^\d+,(.+),([^,]+),(\d+),/.exec(line);
	if (!m) continue;
	const [, city, state, pop] = m;
	const code = STATES[state];
	if (!code) throw new Error(`Unknown state: ${state}`);
	out.push({ city, state: code, population: Number(pop) });
}

fs.writeFileSync(path.join(__dirname, 'cities.json'), JSON.stringify(out, null, '\t'));
console.log(`Wrote ${out.length} cities`);
