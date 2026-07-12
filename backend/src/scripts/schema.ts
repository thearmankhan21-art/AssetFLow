import db from '../config/db';

const initializeProductionSchema = async (): Promise<void> => {
  console.log('--- [AssetFlow DB Initialization] Starting ---');
  
  // Get a single dedicated connection from the pool to execute DDL safely
  const connection = await db.getConnection();

  try {
    // 1. Enter defensive execution mode: Disable key constraints & start transactional block
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.beginTransaction();

    console.log('-> Clearing existing schema instances safely...');
    const targetTables = [
      'audit_records',
      'audit_cycles',
      'maintenance_requests',
      'bookings',
      'transfer_requests',
      'allocations',
      'assets',
      'asset_categories',
      'departments',
      'users'
    ];

    for (const table of targetTables) {
      await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
    }

    console.log('-> Generating core organizational frameworks...');

    // 2. Departments Structure (Self-referencing layout initialized flat first)
    await connection.query(`
      CREATE TABLE \`departments\` (
        \`department_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`head_id\` INT NULL,
        \`parent_id\` INT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_dept_parent\` (\`parent_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. User Directory (Strict role constraints setup natively)[cite: 2]
    await connection.query(`
      CREATE TABLE \`users\` (
        \`user_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) UNIQUE NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`role\` ENUM('Admin', 'Asset Manager', 'Department Head', 'Employee') NOT NULL DEFAULT 'Employee',
        \`department_id\` INT NULL,
        \`status\` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_user_email\` (\`email\`),
        CONSTRAINT \`fk_user_department\` FOREIGN KEY (\`department_id\`) 
          REFERENCES \`departments\` (\`department_id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Resolve the circular dependency loop between users and department heads safely
    await connection.query(`
      ALTER TABLE \`departments\`
      ADD CONSTRAINT \`fk_dept_head\` FOREIGN KEY (\`head_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL,
      ADD CONSTRAINT \`fk_dept_parent\` FOREIGN KEY (\`parent_id\`) REFERENCES \`departments\` (\`department_id\`) ON DELETE SET NULL;
    `);

    console.log('-> Building catalog structure & physical inventory tracking systems...');

    // 5. Asset Categories (JSON type applied for generic non-structured variants)[cite: 2]
    await connection.query(`
      CREATE TABLE \`asset_categories\` (
        \`category_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`custom_fields\` JSON NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Assets Master Matrix[cite: 2]
    await connection.query(`
      CREATE TABLE \`assets\` (
        \`asset_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`asset_tag\` VARCHAR(100) UNIQUE NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`category_id\` INT NOT NULL,
        \`serial_number\` VARCHAR(150) NULL,
        \`acquisition_date\` DATE NULL,
        \`condition_status\` ENUM('Good', 'Fair', 'Poor') NOT NULL DEFAULT 'Good',
        \`lifecycle_status\` ENUM('Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed') NOT NULL DEFAULT 'Available',
        \`is_shared_resource\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_asset_tag\` (\`asset_tag\`),
        INDEX \`idx_asset_lifecycle\` (\`lifecycle_status\`),
        CONSTRAINT \`fk_asset_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`asset_categories\` (\`category_id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('-> Embedding workflows, queues, and collision resolution frameworks...');

    // 7. Allocation Registries (Tracks assignments to humans or aggregate departments)[cite: 2]
    await connection.query(`
      CREATE TABLE \`allocations\` (
        \`allocation_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`asset_id\` INT NOT NULL,
        \`assigned_to_user\` INT NULL,
        \`assigned_to_dept\` INT NULL,
        \`expected_return_date\` DATE NULL,
        \`status\` ENUM('Active', 'Returned', 'Overdue') NOT NULL DEFAULT 'Active',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_alloc_lookup\` (\`asset_id\`, \`status\`),
        CONSTRAINT \`fk_alloc_asset\` FOREIGN KEY (\`asset_id\`) REFERENCES \`assets\` (\`asset_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_alloc_user\` FOREIGN KEY (\`assigned_to_user\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_alloc_dept\` FOREIGN KEY (\`assigned_to_dept\`) REFERENCES \`departments\` (\`department_id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Allocation Contention Queue (Conflict Pipeline)[cite: 2]
    await connection.query(`
      CREATE TABLE \`transfer_requests\` (
        \`transfer_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`asset_id\` INT NOT NULL,
        \`requested_by\` INT NOT NULL,
        \`current_holder\` INT NOT NULL,
        \`status\` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_trans_asset\` FOREIGN KEY (\`asset_id\`) REFERENCES \`assets\` (\`asset_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_trans_requester\` FOREIGN KEY (\`requested_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_trans_holder\` FOREIGN KEY (\`current_holder\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Time-Slot Calendar Engine (Supports strict programmatic isolation queries)[cite: 2]
    await connection.query(`
      CREATE TABLE \`bookings\` (
        \`booking_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`asset_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`start_time\` DATETIME NOT NULL,
        \`end_time\` DATETIME NOT NULL,
        \`status\` ENUM('Upcoming', 'Ongoing', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Upcoming',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_booking_schedule\` (\`asset_id\`, \`start_time\`, \`end_time\`),
        CONSTRAINT \`fk_book_asset\` FOREIGN KEY (\`asset_id\`) REFERENCES \`assets\` (\`asset_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_book_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Engineering Maintenances Ledger[cite: 2]
    await connection.query(`
      CREATE TABLE \`maintenance_requests\` (
        \`request_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`asset_id\` INT NOT NULL,
        \`requested_by\` INT NOT NULL,
        \`status\` ENUM('Pending', 'Approved', 'In Progress', 'Resolved', 'Rejected') NOT NULL DEFAULT 'Pending',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_maint_asset\` FOREIGN KEY (\`asset_id\`) REFERENCES \`assets\` (\`asset_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_maint_user\` FOREIGN KEY (\`requested_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('-> Compiling tracking and structural validation loops...');

    // 11. Periodic Verification Anchors[cite: 2]
    await connection.query(`
      CREATE TABLE \`audit_cycles\` (
        \`audit_cycle_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`scope_department_id\` INT NULL,
        \`scope_location\` VARCHAR(255) NULL,
        \`start_date\` DATE NOT NULL,
        \`end_date\` DATE NOT NULL,
        \`status\` ENUM('Open', 'Closed') NOT NULL DEFAULT 'Open',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_audit_cycle_dept\` FOREIGN KEY (\`scope_department_id\`) REFERENCES \`departments\` (\`department_id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. Evaluation Event Tracking Item[cite: 2]
    await connection.query(`
      CREATE TABLE \`audit_records\` (
        \`audit_record_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`audit_cycle_id\` INT NOT NULL,
        \`asset_id\` INT NOT NULL,
        \`auditor_id\` INT NOT NULL,
        \`verification_status\` ENUM('Verified', 'Missing', 'Damaged') NOT NULL DEFAULT 'Verified',
        \`notes\` TEXT NULL,
        \`verified_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_record_cycle\` FOREIGN KEY (\`audit_cycle_id\`) REFERENCES \`audit_cycles\` (\`audit_cycle_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_record_asset\` FOREIGN KEY (\`asset_id\`) REFERENCES \`assets\` (\`asset_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_record_auditor\` FOREIGN KEY (\`auditor_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Commit changes safely if everything went smoothly
    await connection.commit();
    console.log('--- [AssetFlow DB Initialization] Schema Compiled Successfully ---');
  } catch (error) {
    // If anything broke, rollback completely to prevent corrupted partial schemas
    await connection.rollback();
    console.error('!!! DDL Execution Interrupted! Transaction rolled back completely. Error:', error);
  } finally {
    // Re-enable validation variables and return connection handle safely back to pool
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    connection.release();
    process.exit(0);
  }
};

initializeProductionSchema();