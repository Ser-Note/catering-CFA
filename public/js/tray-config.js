// Shared tray configuration used by both orders.js and tray-cheatsheet.js
const traySizes = {
  "nuggets tray": {
    Small: { tray: '10"', amount: 64 },
    Medium: { tray: '14"', amount: 120 },
    Large: { tray: '16"', amount: 200 }
  },
  "strip tray": {
    Small: { tray: '10"', amount: 24 },
    Medium: { tray: '10"', amount: 45 },
    Large: { tray: '10"', amount: 75 }
  },
  "cool wrap tray": {
    Small: { halves: 6 },
    Medium: { halves: 10 },
    Large: { halves: 14 }
  },
  "garden salad tray": {
    Small: { tray: '10"', lettuce: '2 oz', tomatoes: 10 },
    Large: { tray: '14"', lettuce: '4 oz', tomatoes: 20 }
  },
  "chocolate chunk cookie tray": {
    Small: { tray: '10"', amount: 12 },
    Large: { tray: '14"', amount: 24 }
  },
  "chocolate fudge brownie tray": {
    Small: { tray: '10"', amount: 12 },
    Large: { tray: '14"', amount: 24 }
  },
  "mixed cookie & brownie tray": {
    Small: { tray: '10"', cookies: 6, brownies: 6 },
    Large: { tray: '14"', cookies: 12, brownies: 12 }
  },
  "mac & cheese tray": {
    Small: { "Aluminum Pan/Lid": "Half Size x1", "Mac & Cheese": "Full Batch" },
    Large: { "Aluminum Pan/Lid": "Half Size x2", "Mac & Cheese": "2 Full Batches" }
  },
  "chick-n-mini tray": {
    "20": { tray: '10"', amount: 20 },
    "40": { tray: '14"', amount: 40 }
  },
  "fruit tray": {
    Small: {
      tray: '10"',
      "bottom layer": "Red and Green Apples ~ 12oz, Mandarin Oranges ~ 6oz, Strawberry Halves ~ 6oz, Blueberries ~ 1.5",
      "top layer": "Red and Green Apples ~ 12oz, Mandarin Oranges ~ 6oz, Strawberry Halves ~ 6oz, Blueberries ~ 1.5"
    },
    Large: {
      tray: '14"',
      "bottom layer": "Red and Green Apples ~ 1lb 8oz, Mandarin Oranges ~ 13oz, Strawberry Halves ~ 13oz, Blueberries ~ 2",
      "top layer": "Red and Green Apples ~ 1lb 8oz, Mandarin Oranges ~ 13oz, Strawberry Halves ~ 13oz, Blueberries ~ 2"
    }
  }
};

// Add aliases for common variations
traySizes["cool wrap® tray"] = traySizes["cool wrap tray"];
traySizes["wraps tray"] = traySizes["cool wrap tray"];
traySizes["strips tray"] = traySizes["strip tray"];
traySizes["cookie tray"] = traySizes["chocolate chunk cookie tray"];
traySizes["brownie tray"] = traySizes["chocolate fudge brownie tray"];
traySizes["combo dessert tray"] = traySizes["mixed cookie & brownie tray"];
traySizes["Chick-n-Strips® Tray"] = traySizes["strip tray"];