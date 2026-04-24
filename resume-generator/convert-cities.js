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

const BLUE = new Set([
	'CA', 'NY', 'IL', 'MA', 'WA', 'OR', 'NJ', 'CT', 'MD', 'DE', 'RI', 'VT',
	'HI', 'ME', 'MN', 'NM', 'CO', 'VA', 'DC',
]);
// Reliable red + swing/edge states (user wants edge states classed as red)
const RED = new Set([
	'TX', 'FL', 'OH', 'IN', 'KY', 'TN', 'AL', 'MS', 'LA', 'AR', 'MO', 'OK',
	'KS', 'NE', 'SD', 'ND', 'MT', 'WY', 'ID', 'UT', 'AK', 'WV', 'SC', 'IA',
	'PA', 'MI', 'WI', 'AZ', 'GA', 'NV', 'NC', 'NH',
]);

const input = fs.readFileSync(path.join(__dirname, 'cities.txt'), 'utf8');
const out = [];
for (const line of input.split('\n')) {
	const m = /^\d+,(.+),([^,]+),(\d+),/.exec(line);
	if (!m) continue;
	const [, city, state, pop] = m;
	const code = STATES[state];
	if (!code) throw new Error(`Unknown state: ${state}`);
	let party;
	if (BLUE.has(code)) party = 'blue';
	else if (RED.has(code)) party = 'red';
	else throw new Error(`Unclassified state: ${code}`);
	out.push({ city, state: code, population: Number(pop), party });
}

fs.writeFileSync(path.join(__dirname, 'cities.json'), JSON.stringify(out, null, '\t'));
console.log(`Wrote ${out.length} cities`);
