-- UCLEAN Database Seed Data
-- Initial data for development and testing

-- Insert default store
INSERT OR IGNORE INTO stores (id, code, name, gstin, phone, address) VALUES
(1, 'UC634', 'UClean Massoorie Road', '05BCFPJ0289J1ZK', '9999759911', 'Mussoori Road, Near DIT UNIVERSITY, DEHRADUN, UTTARAKHAND - 248009');

-- Insert service categories
INSERT OR IGNORE INTO service_categories (id, name, parent_id) VALUES
(1, 'Laundry', NULL),
(2, 'Premium Laundry', NULL),
(3, 'Laundry Add-ons', NULL),
(4, 'Dry Cleaning - Men', NULL),
(5, 'Dry Cleaning - Women', NULL),
(6, 'Dry Cleaning - Kids', NULL),
(7, 'Household Items', NULL),
(8, 'Shoes & Bags', NULL),
(9, 'Carpet & Sofa Cleaning', NULL);

-- Insert laundry services
INSERT OR IGNORE INTO services (id, category_id, name, unit, base_price, min_qty, gst_rate, hsn_sac_code) VALUES
(1, 1, 'Wash & Fold', 'kg', 59, 5, 18, '999711'),
(2, 1, 'Wash & Iron', 'kg', 89, 5, 18, '999711'),
(3, 1, 'Steam Iron', 'piece', 10, 5, 18, '999711'),
(4, 2, 'Premium Laundry', 'kg', 159, 0, 18, '999711');

-- Insert laundry add-ons
INSERT OR IGNORE INTO addons (id, name, unit, price, gst_rate) VALUES
(1, 'Moth Proofing', 'kg', 20, 18),
(2, 'Antiseptic', 'kg', 10, 18),
(3, 'Stain Removal', 'stain', 30, 18),
(4, 'Starch', 'piece', 25, 18),
(5, 'Softener', 'kg', 5, 18),
(6, 'Extra Soiled', 'kg', 10, 18),
(7, 'Shoe Laundry', 'pair', 149, 18),
(8, 'Hanger Packing', 'piece', 30, 18),
(9, 'Shirt Packing', 'piece', 15, 18),
(10, 'Express Delivery', 'order', 0, 18); -- calculated as percentage

-- Insert household items
INSERT OR IGNORE INTO services (id, category_id, name, unit, base_price, gst_rate, hsn_sac_code) VALUES
(10, 7, 'Bath Mat', 'piece', 39, 18, '999712'),
(11, 7, 'Bath Robe Small', 'piece', 49, 18, '999712'),
(12, 7, 'Bath Robe Big', 'piece', 69, 18, '999712'),
(13, 7, 'Bath Towel', 'piece', 49, 18, '999712'),
(14, 7, 'Bed Sheet Single', 'piece', 99, 18, '999712'),
(15, 7, 'Bed Sheet Double/King', 'piece', 159, 18, '999712'),
(16, 7, 'Blanket Single', 'piece', 279, 18, '999712'),
(17, 7, 'Blanket Double/King', 'piece', 359, 18, '999712'),
(18, 7, 'Quilt Single', 'piece', 359, 18, '999712'),
(19, 7, 'Quilt Double/King', 'piece', 439, 18, '999712'),
(20, 7, 'Curtain Without Lining', 'piece', 189, 18, '999712'),
(21, 7, 'Curtain With Lining', 'piece', 279, 18, '999712'),
(22, 7, 'Sofa Cover Per Seat', 'piece', 99, 18, '999712');

-- Insert men's dry cleaning services
INSERT OR IGNORE INTO services (id, category_id, name, unit, base_price, gst_rate, hsn_sac_code) VALUES
(30, 4, 'Shirt', 'piece', 49, 18, '999712'),
(31, 4, 'T-Shirt', 'piece', 25, 18, '999712'),
(32, 4, 'Jeans / Pants', 'piece', 79, 18, '999712'),
(33, 4, 'Kurta Pajama (Light)', 'set', 119, 18, '999712'),
(34, 4, 'Kurta Pajama (Heavy)', 'set', 159, 18, '999712'),
(35, 4, 'Suit 2 Pc', 'set', 189, 18, '999712'),
(36, 4, 'Suit 3 Pc', 'set', 239, 18, '999712'),
(37, 4, 'Sherwani / Achkan', 'piece', 299, 18, '999712'),
(38, 4, 'Overcoat', 'piece', 289, 18, '999712');

-- Insert women's dry cleaning services (with dynamic pricing)
INSERT OR IGNORE INTO services (id, category_id, name, unit, base_price, gst_rate, is_dynamic, hsn_sac_code) VALUES
(50, 5, 'Blouse/Top', 'piece', 29, 18, 0, '999712'),
(51, 5, 'Dress (Cotton)', 'piece', 99, 18, 0, '999712'),
(52, 5, 'Dress (Heavy)', 'piece', 239, 18, 1, '999712'),
(53, 5, 'Saree', 'piece', 159, 18, 1, '999712'),
(54, 5, 'Lehenga + Dupatta', 'set', 599, 18, 1, '999712'),
(55, 5, 'Dupatta / Scarf', 'piece', 49, 18, 0, '999712');

-- Insert service variants for dynamic pricing
-- Saree variants
INSERT OR IGNORE INTO service_variants (id, service_id, variant_name, base_price, gst_rate) VALUES
(1, 53, 'Cotton/Synthetic', 159, 18),
(2, 53, 'Silk/Chiffon/Georgette', 239, 18),
(3, 53, 'Embroidered/Heavy', 299, 18);

-- Dress (Heavy) variants
INSERT OR IGNORE INTO service_variants (id, service_id, variant_name, base_price, gst_rate) VALUES
(4, 52, 'Cotton', 239, 18),
(5, 52, 'Silk/Velvet', 299, 18);

-- Lehenga variants
INSERT OR IGNORE INTO service_variants (id, service_id, variant_name, base_price, gst_rate) VALUES
(6, 54, 'Regular', 599, 18),
(7, 54, 'Designer/Heavy', 799, 18);

-- Insert kids' dry cleaning services
INSERT OR IGNORE INTO services (id, category_id, name, unit, base_price, gst_rate, hsn_sac_code) VALUES
(70, 6, 'Frock', 'piece', 49, 18, '999712'),
(71, 6, 'Kurta + Pants/Salwar/Churidar + Dupatta', 'set', 119, 18, '999712'),
(72, 6, 'Sweater (Sleeveless)', 'piece', 45, 18, '999712'),
(73, 6, 'Sweater (Full Sleeves)', 'piece', 49, 18, '999712'),
(74, 6, 'T-Shirt', 'piece', 25, 18, '999712'),
(75, 6, 'Shorts', 'piece', 19, 18, '999712');

-- Insert shoes & bags services
INSERT OR IGNORE INTO services (id, category_id, name, unit, base_price, gst_rate, hsn_sac_code) VALUES
(80, 8, 'Shoes (Kids)', 'pair', 199, 18, '999712'),
(81, 8, 'Shoes (Adult - Cotton/Synthetic)', 'pair', 299, 18, '999712'),
(82, 8, 'Shoes (Adult - Silk/Velvet/Jute)', 'pair', 399, 18, '999712'),
(83, 8, 'Suitcase Small', 'piece', 199, 18, '999712'),
(84, 8, 'Suitcase Medium', 'piece', 319, 18, '999712'),
(85, 8, 'Suitcase Big', 'piece', 399, 18, '999712');

-- Insert carpet & sofa cleaning
INSERT OR IGNORE INTO services (id, category_id, name, unit, base_price, gst_rate, hsn_sac_code) VALUES
(90, 9, 'Carpet Cleaning', 'sqft', 20, 18, '999712'),
(91, 9, 'Sofa Cleaning 1 Seater', 'piece', 299, 18, '999712'),
(92, 9, 'Sofa Cleaning 2 Seater', 'piece', 499, 18, '999712'),
(93, 9, 'Sofa Cleaning 3 Seater', 'piece', 699, 18, '999712');

-- Insert sample customers for testing
INSERT OR IGNORE INTO customers (id, name, phone, address) VALUES
(1, 'Mayank', '9050284500', 'T2 103, Golden Manor'),
(2, 'Gaurav Dimri', '9897722300', 'House no 03, White House Building, Nirvana Residency'),
(3, 'Priya Sharma', '9876543210', '123 Test Street, Delhi'),
(4, 'Rajesh Kumar', '9999888777', 'Flat 201, Sunrise Apartments'),
(5, 'Anita Singh', '8888777666', 'Villa 15, Green Valley Society');

-- Insert terms and conditions
INSERT OR IGNORE INTO terms_conditions (store_id, content) VALUES
(1, '1. Ensure All Original Bill Or Challan Copy After Due Delivery Of Articles Is To Be Presented.
2. Original Bill Or Challan Copy Needs To Be Presented At The Time Of Delivery Of Processed Articles.
3. If Original Bill Or Challan Is Not Presented At The Time Of Delivery, The Delivery Of Processed Article Shall Be Handed To The Owner Only After Verifying His/Her Credentials.
4. Express/Urgent Delivery Of Articles Would Be Charged 50% Extra Of The Regular Tariff.
5. If Original Bill Or Challan Is Not Presented At The Time Of Delivery, We Would Not Be Held Responsible For Any Loss Or Misplacement Of Article.
6. If Not Satisfied With The Quality Of Any Service Offered, Customers Should Get In Touch With The Store Or The Company Within 48 Hours Post Collection.
7. We Are Not Responsible For Stains Caused Due To Ink Marks, Christmas Stickers, Damages To Embellishments Or Embroidery, Work On Fine Articles During Processing.
8. We Might Charge You Additional For Best Efforts To Remove Any Stains Or Unwanted Marks On The Clothes.
9. This Is A ''Wear & Tear'' Policy. All Puttings In Garment Stains Or Marks Customers Will Have No Claim Whatsoever Or No Liability For Damage Caused To Articles On Account Of This.
10. ''No Fault No Claim'' Policy. If Articles Are Accepted At Customer''s Risk, We Shall Not Be Held Responsible For Damage To Articles That Occur During Processing Of Any Cleanings Or Any Discoloration Of Clothes.
11. We Shall Not Be Held Responsible For Any Ornaments Or Jewelry Fittings On Your Clothes Getting Damaged During The Process.
12. We Shall Not Be Held Responsible For Shrinking, Damage, Cuts, Holes, Stretches, Stains Etc. Becoming Apparent During The Wash Process Due To Defective Manufacturing, Adulteration, Deterioration, Wear & Tear, And Exposure To Environment.
13. We Will Put Our Best Efforts To Ensure Timely Pick-Up And Delivery. However, There Might Be Incidents Beyond Our Control Or Incidences Of Force Majeure Where We Are Unable To Stick To The Timelines. In Such Cases, Customer Cannot Claim Any Indemnifications, Refunds, Or Any Reduction In Charges.
14. We Do Not Accept Liability For Any Items In The Clothes Of The Customer Beyond 3 (Three) Weeks Of The Scheduled Delivery Date.
15. We Do Not Accept Liability For Any Loss Or Damage To Clothes Arising Due To Fire, Burglary, Which Are Beyond Our Control At Any Of Our Stores, Franchises, Or Any Other Locations.
16. We Will Ensure Thorough Checking For Valuable Articles/Cash Etc. Inadvertently Kept In The Articles Which Is Malodour Or Unrecoverable After Processing.
17. The Charges For Express/Urgent Delivery For Clothes Or Any Other Articles Needs Practice Would Be Decided On A Case-To-Case Basis, And Expressed/Intimated To The Customer Directly At The Store Once The Article Has Been Confirmed By The Person Present At The Store.
18. In Case Any Article Or An Item Gets Damaged During The Processing For Any Reasons Other Than The Ones Mentioned Above, The Compensation For The Customer Would Be Limited To 10 Times The Value Of The Charges Specified At The Counter For The Processing Or INR 3000, Whichever Is Lower.
19. All Disputes Are Subject To The Jurisdiction Of Courts In Delhi Only.
20. We Maintain Fitness Rights To Cancel/Modify/Change The Terms And Conditions At Any Point In Time Without Any Prior Intimation Or Notice.');