// Demo data: a representative subset of Lok Sabha constituencies + national parties.
// Synthetic; for demonstration only. Real production system would source from
// the Election Commission of India (ECI) registers.

export const PARTIES = [
  { id: 'BJP',   name: 'Bharatiya Janata Party',           short: 'BJP',  symbol: '🪷', color: '#FF9933' },
  { id: 'INC',   name: 'Indian National Congress',         short: 'INC',  symbol: '✋', color: '#19AAED' },
  { id: 'AAP',   name: 'Aam Aadmi Party',                  short: 'AAP',  symbol: '🧹', color: '#0044AA' },
  { id: 'TMC',   name: 'All India Trinamool Congress',     short: 'TMC',  symbol: '🌼', color: '#1F6F26' },
  { id: 'DMK',   name: 'Dravida Munnetra Kazhagam',        short: 'DMK',  symbol: '☀️', color: '#E53935' },
  { id: 'SP',    name: 'Samajwadi Party',                  short: 'SP',   symbol: '🚲', color: '#D32F2F' },
  { id: 'BSP',   name: 'Bahujan Samaj Party',              short: 'BSP',  symbol: '🐘', color: '#1A237E' },
  { id: 'CPIM',  name: 'Communist Party of India (Marxist)', short: 'CPIM', symbol: '🔨', color: '#B71C1C' },
  { id: 'NCP',   name: 'Nationalist Congress Party',       short: 'NCP',  symbol: '⏱️', color: '#283593' },
  { id: 'JDU',   name: 'Janata Dal (United)',              short: 'JDU',  symbol: '🏹', color: '#2E7D32' },
  { id: 'IND',   name: 'Independent',                      short: 'IND',  symbol: '⚪', color: '#616161' },
  { id: 'NOTA',  name: 'None of the Above',                short: 'NOTA', symbol: '⊘',  color: '#000000' }
];

// Subset of 60 constituencies covering all major states. Codes are ECI-style.
export const CONSTITUENCIES = [
  // Andhra Pradesh
  { code: 'AP01', name: 'Araku',          state: 'Andhra Pradesh' },
  { code: 'AP02', name: 'Visakhapatnam',  state: 'Andhra Pradesh' },
  { code: 'AP03', name: 'Vijayawada',     state: 'Andhra Pradesh' },
  // Assam
  { code: 'AS01', name: 'Guwahati',       state: 'Assam' },
  { code: 'AS02', name: 'Dibrugarh',      state: 'Assam' },
  // Bihar
  { code: 'BR01', name: 'Patna Sahib',    state: 'Bihar' },
  { code: 'BR02', name: 'Pataliputra',    state: 'Bihar' },
  { code: 'BR03', name: 'Nalanda',        state: 'Bihar' },
  // Chhattisgarh
  { code: 'CG01', name: 'Raipur',         state: 'Chhattisgarh' },
  { code: 'CG02', name: 'Bilaspur',       state: 'Chhattisgarh' },
  // Delhi
  { code: 'DL01', name: 'New Delhi',      state: 'Delhi' },
  { code: 'DL02', name: 'East Delhi',     state: 'Delhi' },
  { code: 'DL03', name: 'Chandni Chowk',  state: 'Delhi' },
  // Gujarat
  { code: 'GJ01', name: 'Ahmedabad West', state: 'Gujarat' },
  { code: 'GJ02', name: 'Gandhinagar',    state: 'Gujarat' },
  { code: 'GJ03', name: 'Vadodara',       state: 'Gujarat' },
  // Haryana
  { code: 'HR01', name: 'Gurgaon',        state: 'Haryana' },
  { code: 'HR02', name: 'Faridabad',      state: 'Haryana' },
  // Himachal Pradesh
  { code: 'HP01', name: 'Shimla',         state: 'Himachal Pradesh' },
  { code: 'HP02', name: 'Kangra',         state: 'Himachal Pradesh' },
  { code: 'HP03', name: 'Hamirpur',       state: 'Himachal Pradesh' },
  { code: 'HP04', name: 'Mandi',          state: 'Himachal Pradesh' },
  // J&K
  { code: 'JK01', name: 'Srinagar',       state: 'Jammu & Kashmir' },
  { code: 'JK02', name: 'Jammu',          state: 'Jammu & Kashmir' },
  // Jharkhand
  { code: 'JH01', name: 'Ranchi',         state: 'Jharkhand' },
  { code: 'JH02', name: 'Dhanbad',        state: 'Jharkhand' },
  // Karnataka
  { code: 'KA01', name: 'Bangalore South',state: 'Karnataka' },
  { code: 'KA02', name: 'Bangalore North',state: 'Karnataka' },
  { code: 'KA03', name: 'Mysore',         state: 'Karnataka' },
  // Kerala
  { code: 'KL01', name: 'Thiruvananthapuram', state: 'Kerala' },
  { code: 'KL02', name: 'Ernakulam',      state: 'Kerala' },
  // MP
  { code: 'MP01', name: 'Bhopal',         state: 'Madhya Pradesh' },
  { code: 'MP02', name: 'Indore',         state: 'Madhya Pradesh' },
  { code: 'MP03', name: 'Jabalpur',       state: 'Madhya Pradesh' },
  // Maharashtra
  { code: 'MH01', name: 'Mumbai South',   state: 'Maharashtra' },
  { code: 'MH02', name: 'Mumbai North',   state: 'Maharashtra' },
  { code: 'MH03', name: 'Pune',           state: 'Maharashtra' },
  { code: 'MH04', name: 'Nagpur',         state: 'Maharashtra' },
  // Odisha
  { code: 'OD01', name: 'Bhubaneswar',    state: 'Odisha' },
  { code: 'OD02', name: 'Cuttack',        state: 'Odisha' },
  // Punjab
  { code: 'PB01', name: 'Amritsar',       state: 'Punjab' },
  { code: 'PB02', name: 'Ludhiana',       state: 'Punjab' },
  // Rajasthan
  { code: 'RJ01', name: 'Jaipur',         state: 'Rajasthan' },
  { code: 'RJ02', name: 'Jodhpur',        state: 'Rajasthan' },
  { code: 'RJ03', name: 'Udaipur',        state: 'Rajasthan' },
  // Tamil Nadu
  { code: 'TN01', name: 'Chennai South',  state: 'Tamil Nadu' },
  { code: 'TN02', name: 'Chennai Central',state: 'Tamil Nadu' },
  { code: 'TN03', name: 'Coimbatore',     state: 'Tamil Nadu' },
  { code: 'TN04', name: 'Madurai',        state: 'Tamil Nadu' },
  // Telangana
  { code: 'TS01', name: 'Hyderabad',      state: 'Telangana' },
  { code: 'TS02', name: 'Secunderabad',   state: 'Telangana' },
  // UP
  { code: 'UP01', name: 'Lucknow',        state: 'Uttar Pradesh' },
  { code: 'UP02', name: 'Varanasi',       state: 'Uttar Pradesh' },
  { code: 'UP03', name: 'Ghaziabad',      state: 'Uttar Pradesh' },
  { code: 'UP04', name: 'Noida',          state: 'Uttar Pradesh' },
  { code: 'UP05', name: 'Allahabad',      state: 'Uttar Pradesh' },
  // Uttarakhand
  { code: 'UK01', name: 'Dehradun',       state: 'Uttarakhand' },
  { code: 'UK02', name: 'Haridwar',       state: 'Uttarakhand' },
  // West Bengal
  { code: 'WB01', name: 'Kolkata North',  state: 'West Bengal' },
  { code: 'WB02', name: 'Kolkata South',  state: 'West Bengal' },
  { code: 'WB03', name: 'Howrah',         state: 'West Bengal' }
];
