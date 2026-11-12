-- ============================================================
--  FootpathFix — Sample Data (Seed)
--  CLEARLY LABELLED AS DEMO / SAMPLE DATA
--  Run AFTER schema.sql to populate the database with
--  representative records for demonstration purposes.
-- ============================================================

insert into public.reports (title, category, description, location, status, resolution_note)
values
  (
    '[SAMPLE] Illegally Parked Motorcycles Blocking Footpath',
    'Illegal Parking',
    'A row of approximately 8–10 motorcycles are parked directly on the footpath outside the commercial complex, forcing pedestrians to walk on the road. This has been an issue for several weeks.',
    'Near Commercial Complex, MG Road, Sector 12, New Delhi — 110001',
    'Pending',
    null
  ),
  (
    '[SAMPLE] Street Vendor Stall Blocking Entire Pavement',
    'Street Vendors',
    'A fruit and vegetable vendor has set up a large stall that extends across the full width of the footpath. During peak hours, pedestrians have no choice but to walk on the road. The vendor has been asked to move multiple times without success.',
    'Opp. City Bank, Anna Nagar Main Street, Chennai — 600040',
    'In Progress',
    null
  ),
  (
    '[SAMPLE] Cement Bags and Sand Piled on Footpath',
    'Construction Materials',
    'A building under construction adjacent to the footpath has stored large quantities of cement bags, sand and iron rods on the footpath. The materials have been there for over 3 weeks and there is no temporary footpath diversion in place.',
    'Plot 24, Park Street Ext, Block C, Kolkata — 700016',
    'Resolved',
    'Construction site supervisor contacted. Materials cleared by field team on 10 Nov 2026. Footpath restored to walkable condition.'
  ),
  (
    '[SAMPLE] Garbage Dumped at Footpath Corner',
    'Garbage and Waste',
    'A large pile of household garbage has been dumped at the corner of the footpath near the bus stop. The waste includes plastic bags, food waste and old furniture. It is a health hazard and blocks access to the bus stop ramp.',
    'Bus Stop 42, Linking Road, Bandra West, Mumbai — 400050',
    'Pending',
    null
  ),
  (
    '[SAMPLE] Broken Footpath Tiles Creating Tripping Hazard',
    'Damaged Footpath',
    'Several concrete tiles on the footpath have cracked and heaved, creating a significant tripping hazard. At least 3 elderly residents have reported near-falls. The broken section extends approximately 15 metres.',
    'Nehru Nagar, Sadashivanagar, Bengaluru — 560080',
    'Pending',
    null
  ),
  (
    '[SAMPLE] Electrical Cable Lying Across Footpath',
    'Other',
    'A loose electrical cable has fallen from a utility pole and is lying across the footpath. This is an immediate safety hazard, especially during rain. BESCOM was informed but has not responded.',
    'Near Bus Depot, Jayanagar 4th Block, Bengaluru — 560041',
    'In Progress',
    null
  );
