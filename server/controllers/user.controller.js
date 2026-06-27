import User from "../models/User.model.js";

// GET /api/users/search?q=name — Search users
export const searchUsers = async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ users: [] });

  try {
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        },
      ],
    })
      .select("name email profilePic isOnline lastSeen")
      .limit(20);

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/users/:id — Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name email profilePic isOnline lastSeen"
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
