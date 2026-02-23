<?php
function getDbConnection(): mysqli
{
    $servername = "localhost";
    $username = "root";
    $password = "Admin@Port";
    $dbname = "library_finance_db";

    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        throw new RuntimeException("Database connection failed: " . $conn->connect_error);
    }

    return $conn;
}
?>
