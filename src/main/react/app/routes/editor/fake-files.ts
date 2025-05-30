const items = {
  root: {
    index: 'root',
    isFolder: true,
    children: ['documents', 'images', 'projects', 'downloads', 'music', 'videos', 'backups', 'personal', 'work'],
    data: 'Root Directory (philipsens) - Last accessed: 2025-04-10 21:59:17',
  },
  documents: {
    index: 'documents',
    isFolder: true,
    children: ['resume.pdf', 'notes.txt', 'report_folder', 'contracts', 'invoices', 'receipts', 'manuals'],
    data: 'Documents Folder',
  },
  'resume.pdf': {
    index: 'resume.pdf',
    children: [],
    data: 'Resume Document - Updated 2025-03-15',
  },
  'notes.txt': {
    index: 'notes.txt',
    children: [],
    data: 'Personal Notes - 45KB',
  },
  report_folder: {
    index: 'report_folder',
    isFolder: true,
    children: ['quarterly_report.docx', 'annual_report.pdf', 'financial_summary.xlsx', 'budget_forecast.pptx'],
    data: 'Reports Collection - 4 items',
  },
  'quarterly_report.docx': {
    index: 'quarterly_report.docx',
    children: [],
    data: 'Q1 2025 Report - 2.3MB',
  },
  'annual_report.pdf': {
    index: 'annual_report.pdf',
    children: [],
    data: 'Annual Financial Report - 8.7MB',
  },
  'financial_summary.xlsx': {
    index: 'financial_summary.xlsx',
    children: [],
    data: 'Financial Summary Spreadsheet - 1.2MB',
  },
  'budget_forecast.pptx': {
    index: 'budget_forecast.pptx',
    children: [],
    data: 'Budget Forecast Presentation - 5.8MB',
  },
  contracts: {
    index: 'contracts',
    isFolder: true,
    children: ['client_agreement.pdf', 'nda.pdf', 'service_contract.docx', 'employment_contract.pdf'],
    data: 'Legal Contracts - 4 items',
  },
  'client_agreement.pdf': {
    index: 'client_agreement.pdf',
    children: [],
    data: 'Client Agreement - Signed 2025-01-10',
  },
  'nda.pdf': {
    index: 'nda.pdf',
    children: [],
    data: 'Non-Disclosure Agreement - 3 pages',
  },
  'service_contract.docx': {
    index: 'service_contract.docx',
    children: [],
    data: 'Service Provider Contract - Draft v3',
  },
  'employment_contract.pdf': {
    index: 'employment_contract.pdf',
    children: [],
    data: 'Employment Terms - HR Approved',
  },
  invoices: {
    index: 'invoices',
    isFolder: true,
    children: ['january_invoice.pdf', 'february_invoice.pdf', 'march_invoice.pdf', 'april_invoice.pdf'],
    data: 'Client Invoices - 2025',
  },
  'january_invoice.pdf': {
    index: 'january_invoice.pdf',
    children: [],
    data: 'January 2025 Invoice - PAID',
  },
  'february_invoice.pdf': {
    index: 'february_invoice.pdf',
    children: [],
    data: 'February 2025 Invoice - PAID',
  },
  'march_invoice.pdf': {
    index: 'march_invoice.pdf',
    children: [],
    data: 'March 2025 Invoice - PENDING',
  },
  'april_invoice.pdf': {
    index: 'april_invoice.pdf',
    children: [],
    data: 'April 2025 Invoice - DRAFT',
  },
  receipts: {
    index: 'receipts',
    isFolder: true,
    children: ['office_supplies.pdf', 'software_licenses.pdf', 'travel_expenses.pdf', 'equipment.pdf'],
    data: 'Expense Receipts - Tax Year 2025',
  },
  'office_supplies.pdf': {
    index: 'office_supplies.pdf',
    children: [],
    data: 'Office Supplies Receipt - $234.56',
  },
  'software_licenses.pdf': {
    index: 'software_licenses.pdf',
    children: [],
    data: 'Software License Purchases - $1,299.99',
  },
  'travel_expenses.pdf': {
    index: 'travel_expenses.pdf',
    children: [],
    data: 'Travel Expenses - Conference 2025',
  },
  'equipment.pdf': {
    index: 'equipment.pdf',
    children: [],
    data: 'New Equipment Purchase - $3,450.00',
  },
  manuals: {
    index: 'manuals',
    isFolder: true,
    children: ['user_guide.pdf', 'admin_manual.pdf', 'quick_start.pdf', 'troubleshooting.pdf'],
    data: 'Product Documentation',
  },
  'user_guide.pdf': {
    index: 'user_guide.pdf',
    children: [],
    data: 'User Guide - v3.2.1',
  },
  'admin_manual.pdf': {
    index: 'admin_manual.pdf',
    children: [],
    data: 'Administrator Manual - v3.2.1',
  },
  'quick_start.pdf': {
    index: 'quick_start.pdf',
    children: [],
    data: 'Quick Start Guide - 12 pages',
  },
  'troubleshooting.pdf': {
    index: 'troubleshooting.pdf',
    children: [],
    data: 'Troubleshooting Guide - Last updated 2025-02-28',
  },
  images: {
    index: 'images',
    isFolder: true,
    children: ['vacation', 'profile_pics', 'screenshots', 'product_photos', 'family', 'events'],
    data: 'Images Folder - 6 subfolders',
  },
  vacation: {
    index: 'vacation',
    isFolder: true,
    children: ['beach_2024.jpg', 'mountain_2024.jpg', 'europe_trip', 'asia_trip'],
    data: 'Vacation Photos - 2 files, 2 folders',
  },
  'beach_2024.jpg': {
    index: 'beach_2024.jpg',
    children: [],
    data: 'Beach Vacation Photo - Maldives 2024',
  },
  'mountain_2024.jpg': {
    index: 'mountain_2024.jpg',
    children: [],
    data: 'Mountain Hiking Photo - Swiss Alps 2024',
  },
  europe_trip: {
    index: 'europe_trip',
    isFolder: true,
    children: ['paris.jpg', 'rome.jpg', 'barcelona.jpg', 'london.jpg', 'berlin.jpg'],
    data: 'European Vacation 2024 - 5 photos',
  },
  'paris.jpg': {
    index: 'paris.jpg',
    children: [],
    data: 'Eiffel Tower - Paris 2024',
  },
  'rome.jpg': {
    index: 'rome.jpg',
    children: [],
    data: 'Colosseum - Rome 2024',
  },
  'barcelona.jpg': {
    index: 'barcelona.jpg',
    children: [],
    data: 'Sagrada Familia - Barcelona 2024',
  },
  'london.jpg': {
    index: 'london.jpg',
    children: [],
    data: 'Big Ben - London 2024',
  },
  'berlin.jpg': {
    index: 'berlin.jpg',
    children: [],
    data: 'Brandenburg Gate - Berlin 2024',
  },
  asia_trip: {
    index: 'asia_trip',
    isFolder: true,
    children: ['tokyo.jpg', 'bangkok.jpg', 'singapore.jpg', 'seoul.jpg', 'shanghai.jpg'],
    data: 'Asian Tour 2023 - 5 photos',
  },
  'tokyo.jpg': {
    index: 'tokyo.jpg',
    children: [],
    data: 'Tokyo Skyline - Japan 2023',
  },
  'bangkok.jpg': {
    index: 'bangkok.jpg',
    children: [],
    data: 'Grand Palace - Bangkok 2023',
  },
  'singapore.jpg': {
    index: 'singapore.jpg',
    children: [],
    data: 'Marina Bay Sands - Singapore 2023',
  },
  'seoul.jpg': {
    index: 'seoul.jpg',
    children: [],
    data: 'Gyeongbokgung Palace - Seoul 2023',
  },
  'shanghai.jpg': {
    index: 'shanghai.jpg',
    children: [],
    data: 'The Bund - Shanghai 2023',
  },
  profile_pics: {
    index: 'profile_pics',
    isFolder: true,
    children: ['linkedin_photo.png', 'github_avatar.png', 'twitter_icon.jpg', 'professional_headshot.jpg'],
    data: 'Profile Pictures - Various Platforms',
  },
  'linkedin_photo.png': {
    index: 'linkedin_photo.png',
    children: [],
    data: 'LinkedIn Profile Photo - Professional',
  },
  'github_avatar.png': {
    index: 'github_avatar.png',
    children: [],
    data: 'GitHub Avatar - Developer Profile',
  },
  'twitter_icon.jpg': {
    index: 'twitter_icon.jpg',
    children: [],
    data: 'Twitter Profile Picture - Casual',
  },
  'professional_headshot.jpg': {
    index: 'professional_headshot.jpg',
    children: [],
    data: 'Professional Headshot - Corporate Website',
  },
  screenshots: {
    index: 'screenshots',
    isFolder: true,
    children: ['bug_report.jpg', 'new_feature.png', 'error_message.png', 'dashboard_demo.png'],
    data: 'Application Screenshots - Work Related',
  },
  'bug_report.jpg': {
    index: 'bug_report.jpg',
    children: [],
    data: 'Bug Report Screenshot - Issue #1245',
  },
  'new_feature.png': {
    index: 'new_feature.png',
    children: [],
    data: 'New Feature Demo - Sprint 34',
  },
  'error_message.png': {
    index: 'error_message.png',
    children: [],
    data: 'Error Message - Production Server',
  },
  'dashboard_demo.png': {
    index: 'dashboard_demo.png',
    children: [],
    data: 'Analytics Dashboard - Client Presentation',
  },
  product_photos: {
    index: 'product_photos',
    isFolder: true,
    children: ['product_lineup.jpg', 'unboxing_series', 'promo_materials'],
    data: 'Product Photography - Marketing Assets',
  },
  'product_lineup.jpg': {
    index: 'product_lineup.jpg',
    children: [],
    data: 'Complete Product Lineup - 2025 Catalog',
  },
  unboxing_series: {
    index: 'unboxing_series',
    isFolder: true,
    children: ['box1.jpg', 'box2.jpg', 'box3.jpg', 'box4.jpg', 'box5.jpg'],
    data: 'Product Unboxing Photo Series',
  },
  'box1.jpg': {
    index: 'box1.jpg',
    children: [],
    data: 'Unboxing Step 1 - Sealed Package',
  },
  'box2.jpg': {
    index: 'box2.jpg',
    children: [],
    data: 'Unboxing Step 2 - Opening Box',
  },
  'box3.jpg': {
    index: 'box3.jpg',
    children: [],
    data: 'Unboxing Step 3 - Accessories',
  },
  'box4.jpg': {
    index: 'box4.jpg',
    children: [],
    data: 'Unboxing Step 4 - Main Product',
  },
  'box5.jpg': {
    index: 'box5.jpg',
    children: [],
    data: 'Unboxing Step 5 - Complete Setup',
  },
  promo_materials: {
    index: 'promo_materials',
    isFolder: true,
    children: ['banner_ad.psd', 'social_media_post.ai', 'email_header.jpg', 'website_hero.png'],
    data: 'Promotional Materials - Marketing Campaign',
  },
  'banner_ad.psd': {
    index: 'banner_ad.psd',
    children: [],
    data: 'Banner Advertisement - Photoshop Source File',
  },
  'social_media_post.ai': {
    index: 'social_media_post.ai',
    children: [],
    data: 'Social Media Graphics - Illustrator Source File',
  },
  'email_header.jpg': {
    index: 'email_header.jpg',
    children: [],
    data: 'Email Marketing Header - Newsletter',
  },
  'website_hero.png': {
    index: 'website_hero.png',
    children: [],
    data: 'Website Hero Image - Homepage Banner',
  },
  family: {
    index: 'family',
    isFolder: true,
    children: ['holiday_2024', 'birthday_party', 'reunion', 'wedding_photos'],
    data: 'Family Photos - Personal Collection',
  },
  holiday_2024: {
    index: 'holiday_2024',
    isFolder: true,
    children: ['christmas.jpg', 'new_year.jpg', 'thanksgiving.jpg', 'halloween.jpg'],
    data: 'Holiday Celebrations - 2024',
  },
  'christmas.jpg': {
    index: 'christmas.jpg',
    children: [],
    data: 'Christmas Family Photo - December 2024',
  },
  'new_year.jpg': {
    index: 'new_year.jpg',
    children: [],
    data: 'New Year Celebration - January 2025',
  },
  'thanksgiving.jpg': {
    index: 'thanksgiving.jpg',
    children: [],
    data: 'Thanksgiving Dinner - November 2024',
  },
  'halloween.jpg': {
    index: 'halloween.jpg',
    children: [],
    data: 'Halloween Costumes - October 2024',
  },
  birthday_party: {
    index: 'birthday_party',
    isFolder: true,
    children: ['cake.jpg', 'presents.jpg', 'party_guests.jpg', 'decorations.jpg'],
    data: 'Birthday Celebration - March 2025',
  },
  'cake.jpg': {
    index: 'cake.jpg',
    children: [],
    data: 'Birthday Cake Photo - Chocolate Theme',
  },
  'presents.jpg': {
    index: 'presents.jpg',
    children: [],
    data: 'Gift Opening Moment - Surprised Face',
  },
  'party_guests.jpg': {
    index: 'party_guests.jpg',
    children: [],
    data: 'Party Guests Group Photo - 24 People',
  },
  'decorations.jpg': {
    index: 'decorations.jpg',
    children: [],
    data: 'Party Decorations - Blue and Gold Theme',
  },
  reunion: {
    index: 'reunion',
    isFolder: true,
    children: ['group_photo.jpg', 'activities.jpg', 'dinner.jpg', 'old_friends.jpg'],
    data: 'Family Reunion - Summer 2024',
  },
  'group_photo.jpg': {
    index: 'group_photo.jpg',
    children: [],
    data: 'Complete Family Group Photo - 42 People',
  },
  'activities.jpg': {
    index: 'activities.jpg',
    children: [],
    data: 'Outdoor Activities - Lake House',
  },
  'dinner.jpg': {
    index: 'dinner.jpg',
    children: [],
    data: 'Family Dinner - Long Table Setup',
  },
  'old_friends.jpg': {
    index: 'old_friends.jpg',
    children: [],
    data: 'Childhood Friends Reunion - 30 Years Later',
  },
  wedding_photos: {
    index: 'wedding_photos',
    isFolder: true,
    children: ['ceremony.jpg', 'reception.jpg', 'first_dance.jpg', 'cake_cutting.jpg'],
    data: 'Smith-Johnson Wedding - May 2024',
  },
  'ceremony.jpg': {
    index: 'ceremony.jpg',
    children: [],
    data: 'Wedding Ceremony - Beach Setting',
  },
  'reception.jpg': {
    index: 'reception.jpg',
    children: [],
    data: 'Wedding Reception - Decorated Hall',
  },
  'first_dance.jpg': {
    index: 'first_dance.jpg',
    children: [],
    data: 'First Dance as Married Couple',
  },
  'cake_cutting.jpg': {
    index: 'cake_cutting.jpg',
    children: [],
    data: 'Wedding Cake Cutting Tradition',
  },
  events: {
    index: 'events',
    isFolder: true,
    children: ['conference_2024', 'company_retreat', 'product_launch', 'team_building'],
    data: 'Event Photography - Professional',
  },
  conference_2024: {
    index: 'conference_2024',
    isFolder: true,
    children: ['keynote.jpg', 'panel_discussion.jpg', 'networking.jpg', 'booth.jpg'],
    data: 'Industry Conference - February 2024',
  },
  'keynote.jpg': {
    index: 'keynote.jpg',
    children: [],
    data: 'Keynote Presentation - Main Stage',
  },
  'panel_discussion.jpg': {
    index: 'panel_discussion.jpg',
    children: [],
    data: 'Expert Panel Discussion - Innovation Track',
  },
  'networking.jpg': {
    index: 'networking.jpg',
    children: [],
    data: 'Networking Event - Evening Reception',
  },
  'booth.jpg': {
    index: 'booth.jpg',
    children: [],
    data: 'Company Booth - Exhibition Hall',
  },
  company_retreat: {
    index: 'company_retreat',
    isFolder: true,
    children: ['team_photo.jpg', 'activities.jpg', 'awards.jpg', 'planning_session.jpg'],
    data: 'Annual Company Retreat - Mountain Resort',
  },
  'team_photo.jpg': {
    index: 'team_photo.jpg',
    children: [],
    data: 'Full Team Photo - 76 Employees',
  },
  'awards.jpg': {
    index: 'awards.jpg',
    children: [],
    data: 'Employee Recognition Awards Ceremony',
  },
  'planning_session.jpg': {
    index: 'planning_session.jpg',
    children: [],
    data: 'Strategic Planning Session - Whiteboard',
  },
  product_launch: {
    index: 'product_launch',
    isFolder: true,
    children: ['reveal.jpg', 'demo.jpg', 'press.jpg', 'audience.jpg'],
    data: 'New Product Launch Event - September 2024',
  },
  'reveal.jpg': {
    index: 'reveal.jpg',
    children: [],
    data: 'Product Reveal Moment - Stage Lighting',
  },
  'demo.jpg': {
    index: 'demo.jpg',
    children: [],
    data: 'Live Product Demonstration - Features',
  },
  'press.jpg': {
    index: 'press.jpg',
    children: [],
    data: 'Press Conference - Media Questions',
  },
  'audience.jpg': {
    index: 'audience.jpg',
    children: [],
    data: 'Audience Reaction - Excitement',
  },
  team_building: {
    index: 'team_building',
    isFolder: true,
    children: ['rope_course.jpg', 'cooking_class.jpg', 'escape_room.jpg', 'volunteering.jpg'],
    data: 'Team Building Activities - Q1 2025',
  },
  'rope_course.jpg': {
    index: 'rope_course.jpg',
    children: [],
    data: 'Outdoor Rope Course Challenge',
  },
  'cooking_class.jpg': {
    index: 'cooking_class.jpg',
    children: [],
    data: 'Team Cooking Class - Italian Cuisine',
  },
  'escape_room.jpg': {
    index: 'escape_room.jpg',
    children: [],
    data: 'Escape Room Challenge - Team Victory',
  },
  'volunteering.jpg': {
    index: 'volunteering.jpg',
    children: [],
    data: 'Community Service Day - Park Cleanup',
  },
  projects: {
    index: 'projects',
    isFolder: true,
    children: ['website_redesign', 'mobile_app', 'data_analysis', 'ai_project', 'client_projects'],
    data: 'Work Projects - 5 Active Projects',
  },
  website_redesign: {
    index: 'website_redesign',
    isFolder: true,
    children: ['wireframes', 'assets', 'code', 'documentation'],
    data: 'Corporate Website Redesign - Q2 2025',
  },
  wireframes: {
    index: 'wireframes',
    isFolder: true,
    children: ['homepage.fig', 'about_page.fig', 'products_page.fig', 'contact_page.fig'],
    data: 'Website Wireframes - Figma Files',
  },
  'homepage.fig': {
    index: 'homepage.fig',
    children: [],
    data: 'Homepage Wireframe - Figma Design',
  },
  'about_page.fig': {
    index: 'about_page.fig',
    children: [],
    data: 'About Page Wireframe - Figma Design',
  },
  'products_page.fig': {
    index: 'products_page.fig',
    children: [],
    data: 'Products Page Wireframe - Figma Design',
  },
  'contact_page.fig': {
    index: 'contact_page.fig',
    children: [],
    data: 'Contact Page Wireframe - Figma Design',
  },
  assets: {
    index: 'assets',
    isFolder: true,
    children: ['logos', 'icons', 'photos', 'videos'],
    data: 'Website Assets - Visual Elements',
  },
  logos: {
    index: 'logos',
    isFolder: true,
    children: ['logo_main.svg', 'logo_dark.svg', 'logo_light.svg', 'favicon.ico'],
    data: 'Company Logos - Brand Identity',
  },
  'logo_main.svg': {
    index: 'logo_main.svg',
    children: [],
    data: 'Main Company Logo - Vector Format',
  },
  'logo_dark.svg': {
    index: 'logo_dark.svg',
    children: [],
    data: 'Dark Mode Logo Variant - Vector Format',
  },
  'logo_light.svg': {
    index: 'logo_light.svg',
    children: [],
    data: 'Light Mode Logo Variant - Vector Format',
  },
  'favicon.ico': {
    index: 'favicon.ico',
    children: [],
    data: 'Website Favicon - Browser Icon',
  },
  icons: {
    index: 'icons',
    isFolder: true,
    children: ['social_icons.svg', 'ui_icons.svg', 'feature_icons.svg', 'navigation_icons.svg'],
    data: 'Icon Set - Website Interface',
  },
  'social_icons.svg': {
    index: 'social_icons.svg',
    children: [],
    data: 'Social Media Icons - Sprite Sheet',
  },
  'ui_icons.svg': {
    index: 'ui_icons.svg',
    children: [],
    data: 'UI Element Icons - Sprite Sheet',
  },
  'feature_icons.svg': {
    index: 'feature_icons.svg',
    children: [],
    data: 'Feature Highlight Icons - Sprite Sheet',
  },
  'navigation_icons.svg': {
    index: 'navigation_icons.svg',
    children: [],
    data: 'Navigation Menu Icons - Sprite Sheet',
  },
  photos: {
    index: 'photos',
    isFolder: true,
    children: ['team_photos', 'office_photos', 'product_photos.zip', 'event_photos.zip'],
    data: 'Website Photography - Optimized Images',
  },
  team_photos: {
    index: 'team_photos',
    isFolder: true,
    children: ['ceo.jpg', 'executive_team.jpg', 'department_heads.jpg', 'full_staff.jpg'],
    data: 'Team Member Photography - Professional Headshots',
  },
  'ceo.jpg': {
    index: 'ceo.jpg',
    children: [],
    data: 'CEO Portrait - Leadership Section',
  },
  'executive_team.jpg': {
    index: 'executive_team.jpg',
    children: [],
    data: 'Executive Team Photo - About Page',
  },
  'department_heads.jpg': {
    index: 'department_heads.jpg',
    children: [],
    data: 'Department Leaders - Team Section',
  },
  'full_staff.jpg': {
    index: 'full_staff.jpg',
    children: [],
    data: 'Complete Staff Photo - Company Culture',
  },
  office_photos: {
    index: 'office_photos',
    isFolder: true,
    children: ['reception.jpg', 'workspace.jpg', 'meeting_rooms.jpg', 'cafeteria.jpg'],
    data: 'Office Environment Photography - Careers Page',
  },
  'workspace.jpg': {
    index: 'workspace.jpg',
    children: [],
    data: 'Open Workspace - Collaborative Environment',
  },
  'meeting_rooms.jpg': {
    index: 'meeting_rooms.jpg',
    children: [],
    data: 'Meeting Room Facilities - Conference Areas',
  },
  'cafeteria.jpg': {
    index: 'cafeteria.jpg',
    children: [],
    data: 'Company Cafeteria - Break Area',
  },
  'product_photos.zip': {
    index: 'product_photos.zip',
    children: [],
    data: 'Product Photography Archive - 45 Images',
  },
  'event_photos.zip': {
    index: 'event_photos.zip',
    children: [],
    data: 'Corporate Events Archive - 78 Images',
  },
  videos: {
    index: 'videos',
    isFolder: true,
    children: ['company_intro.mp4', 'product_demo.mp4', 'testimonials.mp4', 'behind_scenes.mp4'],
    data: 'Video Content - Website Media',
  },
  'company_intro.mp4': {
    index: 'company_intro.mp4',
    children: [],
    data: 'Company Introduction Video - 2:45 min',
  },
  'product_demo.mp4': {
    index: 'product_demo.mp4',
    children: [],
    data: 'Product Demonstration Video - 3:12 min',
  },
  'testimonials.mp4': {
    index: 'testimonials.mp4',
    children: [],
    data: 'Customer Testimonials Compilation - 4:30 min',
  },
  'behind_scenes.mp4': {
    index: 'behind_scenes.mp4',
    children: [],
    data: 'Behind the Scenes at Company - 5:18 min',
  },
  code: {
    index: 'code',
    isFolder: true,
    children: ['frontend', 'backend', 'database', 'config'],
    data: 'Website Codebase - Development Files',
  },
  frontend: {
    index: 'frontend',
    isFolder: true,
    children: ['index.html', 'styles.css', 'main.js', 'components'],
    data: 'Frontend Code - Website UI',
  },
  'index.html': {
    index: 'index.html',
    children: [],
    data: 'Main HTML Structure - Homepage',
  },
  'styles.css': {
    index: 'styles.css',
    children: [],
    data: 'CSS Stylesheet - Global Styles',
  },
  'main.js': {
    index: 'main.js',
    children: [],
    data: 'Main JavaScript File - Core Functionality',
  },
  components: {
    index: 'components',
    isFolder: true,
    children: ['header.js', 'footer.js', 'carousel.js', 'contact_form.js'],
    data: 'UI Components - Reusable Elements',
  },
  'header.js': {
    index: 'header.js',
    children: [],
    data: 'Website Header Component - Navigation',
  },
  'footer.js': {
    index: 'footer.js',
    children: [],
    data: 'Website Footer Component - Site Links',
  },
  'carousel.js': {
    index: 'carousel.js',
    children: [],
    data: 'Image Carousel Component - Featured Content',
  },
  'contact_form.js': {
    index: 'contact_form.js',
    children: [],
    data: 'Contact Form Component - User Submission',
  },
  backend: {
    index: 'backend',
    isFolder: true,
    children: ['server.js', 'routes.js', 'controllers', 'models'],
    data: 'Backend Code - Server Logic',
  },
  'server.js': {
    index: 'server.js',
    children: [],
    data: 'Main Server File - Express.js Setup',
  },
  'routes.js': {
    index: 'routes.js',
    children: [],
    data: 'API Routes Configuration - Endpoints',
  },
  controllers: {
    index: 'controllers',
    isFolder: true,
    children: ['user.controller.js', 'product.controller.js', 'contact.controller.js', 'auth.controller.js'],
    data: 'Backend Controllers - Request Handlers',
  },
  'user.controller.js': {
    index: 'user.controller.js',
    children: [],
    data: 'User Management Controller - Account Operations',
  },
  'product.controller.js': {
    index: 'product.controller.js',
    children: [],
    data: 'Product Data Controller - Catalog Management',
  },
  'contact.controller.js': {
    index: 'contact.controller.js',
    children: [],
    data: 'Contact Form Controller - Message Processing',
  },
  'auth.controller.js': {
    index: 'auth.controller.js',
    children: [],
    data: 'Authentication Controller - User Login/Signup',
  },
  models: {
    index: 'models',
    isFolder: true,
    children: ['user.model.js', 'product.model.js', 'message.model.js', 'order.model.js'],
    data: 'Data Models - Database Schema',
  },
  'user.model.js': {
    index: 'user.model.js',
    children: [],
    data: 'User Schema Model - Account Data',
  },
  'product.model.js': {
    index: 'product.model.js',
    children: [],
    data: 'Product Schema Model - Catalog Items',
  },
  'message.model.js': {
    index: 'message.model.js',
    children: [],
    data: 'Message Schema Model - Contact Forms',
  },
  'order.model.js': {
    index: 'order.model.js',
    children: [],
    data: 'Order Schema Model - Purchase Records',
  },
  database: {
    index: 'database',
    isFolder: true,
    children: ['schema.sql', 'migrations', 'seeds', 'queries'],
    data: 'Database Files - SQL and Migrations',
  },
  'schema.sql': {
    index: 'schema.sql',
    children: [],
    data: 'Database Schema - Table Definitions',
  },
  migrations: {
    index: 'migrations',
    isFolder: true,
    children: ['001_initial.sql', '002_add_users.sql', '003_add_products.sql', '004_add_orders.sql'],
    data: 'Database Migrations - Version History',
  },
  '001_initial.sql': {
    index: '001_initial.sql',
    children: [],
    data: 'Initial Database Setup - Base Tables',
  },
  '002_add_users.sql': {
    index: '002_add_users.sql',
    children: [],
    data: 'User Table Migration - Account Storage',
  },
  '003_add_products.sql': {
    index: '003_add_products.sql',
    children: [],
    data: 'Products Table Migration - Catalog Items',
  },
  '004_add_orders.sql': {
    index: '004_add_orders.sql',
    children: [],
    data: 'Orders Table Migration - Purchase Records',
  },
  seeds: {
    index: 'seeds',
    isFolder: true,
    children: ['users.sql', 'products.sql', 'categories.sql', 'sample_data.sql'],
    data: 'Seed Data Files - Initial Content',
  },
  'users.sql': {
    index: 'users.sql',
    children: [],
    data: 'User Seed Data - Test Accounts',
  },
  'products.sql': {
    index: 'products.sql',
    children: [],
    data: 'Product Seed Data - Demo Catalog',
  },
  'categories.sql': {
    index: 'categories.sql',
    children: [],
    data: 'Category Seed Data - Product Classifications',
  },
  'sample_data.sql': {
    index: 'sample_data.sql',
    children: [],
    data: 'Sample Content Seed - Demo Environment',
  },
  queries: {
    index: 'queries',
    isFolder: true,
    children: ['user_queries.sql', 'product_queries.sql', 'report_queries.sql', 'analytics_queries.sql'],
    data: 'SQL Query Files - Common Database Operations',
  },
  'user_queries.sql': {
    index: 'user_queries.sql',
    children: [],
    data: 'User-Related SQL Queries - Account Management',
  },
  'product_queries.sql': {
    index: 'product_queries.sql',
    children: [],
    data: 'Product-Related SQL Queries - Catalog Management',
  },
  'report_queries.sql': {
    index: 'report_queries.sql',
    children: [],
    data: 'Reporting SQL Queries - Business Intelligence',
  },
  'analytics_queries.sql': {
    index: 'analytics_queries.sql',
    children: [],
    data: 'Analytics SQL Queries - User Behavior',
  },
}

export default items
