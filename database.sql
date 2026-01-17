-- Database: pos_system

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+08:00";

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE IF NOT EXISTS `products` (
  `id` varchar(50) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `web_name` varchar(255) DEFAULT '',
  `product_url` varchar(255) DEFAULT '',
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `web_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `srp` decimal(10,2) NOT NULL DEFAULT 0.00,
  `category` varchar(100) DEFAULT 'General',
  `brand` varchar(100) DEFAULT 'Generic',
  `description` text,
  `imageUrl` varchar(255) DEFAULT '',
  `stock_json` json DEFAULT NULL COMMENT 'Stores stock per branch e.g. {"b1": 10, "b2": 5}',
  `trackStock` tinyint(1) NOT NULL DEFAULT 1,
  `lowStockThreshold` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `sku`, `name`, `price`, `cost`, `srp`, `category`, `brand`, `description`, `imageUrl`, `stock_json`, `trackStock`, `lowStockThreshold`) VALUES
('p1', 'CPU-INT-i9', 'Intel Core i9-14900K Processor', 4599.00, 4200.00, 4899.00, 'CPU', 'Intel', '24 cores (8P+16E), up to 6.0 GHz', '', '{"b1": 10, "b2": 5, "b3": 2}', 1, 3),
('p2', 'CPU-AMD-7800X3D', 'AMD Ryzen 7 7800X3D', 3299.00, 2900.00, 3599.00, 'CPU', 'AMD', '8 cores, 16 threads, 3D V-Cache', '', '{"b1": 8, "b2": 3, "b3": 0}', 1, 2),
('p3', 'GPU-ASUS-4090', 'ASUS ROG Strix GeForce RTX 4090 OC', 15999.00, 14500.00, 16999.00, 'GPU', 'ASUS', '24GB GDDR6X, White Edition', '', '{"b1": 2, "b2": 1, "b3": 0}', 1, 1),
('p4', 'MB-MSI-Z790', 'MSI MAG Z790 TOMAHAWK WIFI', 2199.00, 1900.00, 2399.00, 'Motherboard', 'MSI', 'DDR5, PCIe 5.0, Wi-Fi 6E', '', '{"b1": 15, "b2": 8, "b3": 5}', 1, 5),
('p5', 'RAM-COR-32G', 'Corsair Vengeance RGB DDR5 32GB (2x16GB)', 999.00, 850.00, 1199.00, 'RAM', 'Corsair', '6000MHz CL30', '', '{"b1": 20, "b2": 12, "b3": 8}', 1, 5);

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE IF NOT EXISTS `customers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `companyName` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `remark` text,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `points` int(11) NOT NULL DEFAULT 0,
  `tier` varchar(20) NOT NULL DEFAULT 'General',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `name`, `companyName`, `address`, `remark`, `phone`, `email`, `points`, `tier`) VALUES
('c1', '陳大文 (John)', 'ABC Trading Co.', 'Room 1201, 12/F, Mong Kok Centre', 'Prefer weekend delivery', '91234567', 'john@example.com', 120, 'VIP'),
('c2', 'Tech Solutions Ltd', 'Tech Solutions Ltd', 'Unit A, 5/F, Industrial Bldg, Kwun Tong', 'Net 30 Payment Terms', '21234567', 'procurement@techsol.hk', 5000, 'Corporate'),
('c3', '李小美 (Jane)', NULL, NULL, NULL, '67891234', 'jane@test.com', 0, 'General'),
('c4', '張偉 (David)', NULL, 'Flat B, 3/F, Happiness Court, Sha Tin', NULL, '98765432', 'david@example.com', 50, 'General');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE IF NOT EXISTS `orders` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) DEFAULT 'Cash',
  `status` varchar(20) NOT NULL DEFAULT 'COMPLETED',
  `cashier_name` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE IF NOT EXISTS `categories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`) VALUES
('cat1', 'CPU'),
('cat2', 'GPU'),
('cat3', 'Motherboard'),
('cat4', 'RAM'),
('cat5', 'Storage'),
('cat6', 'Case'),
('cat7', 'Power Supply'),
('cat8', 'Cooling'),
('cat9', 'Peripherals'),
('cat10', 'Monitor'),
('cat11', 'Laptop'),
('cat12', 'Software'),
('cat13', 'Service');

-- --------------------------------------------------------

--
-- Table structure for table `brands`
--

CREATE TABLE IF NOT EXISTS `brands` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `brands`
--

INSERT INTO `brands` (`id`, `name`) VALUES
('br1', 'Intel'),
('br2', 'AMD'),
('br3', 'NVIDIA'),
('br4', 'ASUS'),
('br5', 'MSI'),
('br6', 'Gigabyte'),
('br7', 'Corsair'),
('br8', 'G.Skill'),
('br9', 'Samsung'),
('br10', 'WD'),
('br11', 'Seagate'),
('br12', 'Lian Li'),
('br13', 'NZXT'),
('br14', 'Cooler Master'),
('br15', 'Logitech'),
('br16', 'Razer'),
('br17', 'Microsoft'),
('br18', 'Generic');

-- --------------------------------------------------------

--
-- Table structure for table `customers``order_items`
--

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT 0.00,
  `source_branch_id` varchar(50) DEFAULT NULL,
  `cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(50) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `role` varchar(20) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`, `branch_id`) VALUES
('u1', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alex Wong (Manager)', 'MANAGER', 'b1'),
('u2', 'sales', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah Lee (Clerk)', 'CLERK', 'b1');
-- Note: password is 'password' hashed with bcrypt

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `contact_person`, `email`, `phone`, `address`) VALUES
('s1', 'Synnex Technology', 'Mr. Chan', 'sales@synnex.hk', '27531668', 'Kwai Chung'),
('s2', 'Altech Computer', 'Ms. Wong', 'order@altech.hk', '36283377', 'Lai Chi Kok'),
('s3', 'Hornington (Hanbo)', 'David', 'support@hornington.com', '36269899', 'Kwun Tong');

-- --------------------------------------------------------

--
-- Table structure for table `quotations`
--

CREATE TABLE IF NOT EXISTS `quotations` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `customer_json` json DEFAULT NULL COMMENT 'Snapshot of customer details',
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'DRAFT',
  `valid_until` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `quotation_items`
--

CREATE TABLE IF NOT EXISTS `quotation_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quotation_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `quotation_id` (`quotation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `transfers`
--

CREATE TABLE IF NOT EXISTS `transfers` (
  `id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `product_sku` varchar(50) NOT NULL,
  `from_branch_id` varchar(50) NOT NULL,
  `to_branch_id` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `repairs`
--

CREATE TABLE IF NOT EXISTS `repairs` (
  `id` varchar(50) NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'CUSTOMER',
  `branch_id` varchar(50) NOT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `product_id` varchar(50) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `problem_description` text,
  `accessories` text,
  `supplier_id` varchar(50) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'RECEIVED',
  `created_at` datetime NOT NULL,
  `sent_date` datetime DEFAULT NULL,
  `return_date` datetime DEFAULT NULL,
  `completed_date` datetime DEFAULT NULL,
  `repair_cost` decimal(10,2) DEFAULT 0.00,
  `repair_price` decimal(10,2) DEFAULT 0.00,
  `created_by` varchar(100) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` varchar(50) NOT NULL,
  `supplier_id` varchar(50) NOT NULL,
  `supplier_name` varchar(100) DEFAULT NULL,
  `branch_id` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'DRAFT',
  `expected_date` date DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_order_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `purchase_order_id` (`purchase_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `stock_in_records`
--

CREATE TABLE IF NOT EXISTS `stock_in_records` (
  `id` varchar(50) NOT NULL,
  `batch_id` varchar(50) DEFAULT NULL,
  `date` date NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `supplier_id` varchar(50) DEFAULT NULL,
  `supplier_name` varchar(100) DEFAULT NULL,
  `supplier_doc_no` varchar(100) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `branch_id` varchar(50) NOT NULL,
  `performed_by` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'COMPLETED',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE IF NOT EXISTS `branches` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name`, `code`) VALUES
('b1', '旺角總店 (Mong Kok)', 'MK'),
('b2', '深水埗分店 (SSP)', 'SSP'),
('b3', '灣仔分店 (Wan Chai)', 'WC');

COMMIT;
