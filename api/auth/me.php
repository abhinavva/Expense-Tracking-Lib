<?php
require_once __DIR__ . "/../../config/auth.php";

$user = requireAuth();
jsonResponse(["status" => "success", "user" => $user]);
?>
