<?php
session_start();

// Make sure user is logged in
if (!isset($_SESSION['firstName']) || !isset($_SESSION['lastName'])) {
    die("Error: You must be logged in to access this page.");
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fundraiser Sandwich Order Form & Invoice</title>
<link rel="stylesheet" href="newCatering.css">
<link rel="icon" type="image/x-icon" href="../images/cfalogo.ico">
</head>
<body>
<div class="container">
    <h1>FUNDRAISER SANDWICH ORDER FORM & INVOICE</h1>
    <div class="logo">
        <img src="../images/cfalogo.webp" alt="Chick-fil-A Logo">
    </div>
    <h2>Chick-Fil-A Exeter</h2>
    <h3>4675 Perkiomen Avenue, Reading, PA 19606</h3>
    <h3>610-779-5995</h3>

    <form id="cateringForm" method="POST" action="submitCatering.php">
        <!-- Order Type -->
        <fieldset>
            <legend>Order Type</legend>
            <div class="order-type-container">
                <label><input type="radio" name="orderType" value="pickup" required> Pick-Up</label>
                <label><input type="radio" name="orderType" value="delivery"> Delivery</label>
            </div>
        </fieldset>

        <!-- Date & Time -->
        <fieldset>
            <legend>Date & Time</legend>
            <div class="flex-row">
                <div class="flex-column">
                    <label for="orderDate">Date</label>
                    <input type="date" id="orderDate" name="orderDate" required>
                </div>
                <div class="flex-column">
                    <label for="dayOfWeek">Day of the Week</label>
                    <input type="text" id="dayOfWeek" name="dayOfWeek" readonly>
                </div>
                <div class="flex-column">
                    <label for="timeOfDay">Time of Day</label>
                    <input type="time" id="timeOfDay" name="timeOfDay" required>
                </div>
            </div>
        </fieldset>

        <!-- Contact Information -->
        <fieldset>
            <legend>Contact Information</legend>
            <div class="flex-row">
                <div class="flex-column">
                    <label for="organization">Organization Name</label>
                    <input type="text" id="organization" name="organization" required>
                </div>
                <div class="flex-column">
                    <label for="contactName">Contact Name</label>
                    <input type="text" id="contactName" name="contactName" required>
                </div>
                <div class="flex-column">
                    <label for="contactPhone">Contact Phone Number</label>
                    <input type="text" id="contactPhone" name="contactPhone" required>
                </div>
            </div>
        </fieldset>

        <hr>

        <!-- Order Details -->
        <fieldset>
            <legend>Order Details</legend>
            <div class="flex-row">
                <div class="flex-column">
                    <label for="numSandwiches">Number of Sandwiches</label>
                    <input type="number" id="numSandwiches" name="numSandwiches" min="0" value="0" required>
                </div>
                <div class="flex-column">
                    <label>Other Items</label>
                    <div id="otherItemsContainer"></div>
                    <button type="button" id="addItemBtn">Add Another Item</button>
                </div>
                <div class="flex-column">
                    <label>Pickles?</label>
                    <select id="pickles" name="pickles">
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </div>
            </div>
            <div class="flex-column">
                <label>Sauces (choose as many as you’d like):</label>
                <div class="sauce-options">
                    <label><input type="checkbox" name="sauces[]" value="BBQ"> BBQ</label><br>
                    <label><input type="checkbox" name="sauces[]" value="Chick-fil-A"> Chick-fil-A</label><br>
                    <label><input type="checkbox" name="sauces[]" value="Garden Herb Ranch"> Garden Herb Ranch</label><br>
                    <label><input type="checkbox" name="sauces[]" value="Honey Mustard"> Honey Mustard</label><br>
                    <label><input type="checkbox" name="sauces[]" value="Honey Roasted BBQ"> Honey Roasted BBQ</label><br>
                    <label><input type="checkbox" name="sauces[]" value="Ketchup"> Ketchup</label><br>
                    <label><input type="checkbox" name="sauces[]" value="Mayonnaise"> Mayonnaise</label><br>
                    <label><input type="checkbox" name="sauces[]" value="Polynesian"> Polynesian</label><br>
                    <label><input type="checkbox" name="sauces[]" value="Sweet and Spicy Sriracha"> Sweet and Spicy Sriracha</label><br>
                    <label><input type="checkbox" name="sauces[]" value="Zesty Buffalo"> Zesty Buffalo</label>
                </div>
            </div>

            <div class="flex-row">
                <div class="flex-column">
                    <label for="numBags">Number of Heated Bags Needed</label>
                    <input type="number" id="numBags" name="numBags" min="0" value="0">
                </div>
                <div class="flex-column">
                    <label>Amount Due ($):</label>
                    <input type="text" id="amountDue" name="amountDue">
                    <p class="small-text">Payment must be collected prior to orders going out.</p>
                </div>
            </div>
        </fieldset>

        <!-- Hidden field for concatenating other items -->
        <input type="hidden" name="other" id="hiddenOther">

        <hr>
        <p class="warning">PLEASE RETURN HOT BAGS WITHIN 48 HOURS AFTER EVENT HAS CONCLUDED</p>
        <p class="warning">Discard any Chick-fil-A products that have been at room temperature for two or more hours.</p>

        <button type="button" id="goBackBtn">← Go Back</button>
        <button type="submit">Submit Order</button>
    </form>
</div>

<script src="newCatering.js"></script>
</body>
</html>
