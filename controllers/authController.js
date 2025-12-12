const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const generateToken = require('../utils/generateToken');
const { AppError, catchAsync } = require('../middleware/errorMiddleware');

// User Registration
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, district } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) return next(new AppError('Email already registered', 400));

  const user = await User.create({
    name,
    email,
    phone,
    password,
    district, 
    role: 'help_seeker' 
  });

  const token = generateToken(user._id);

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        district: user.district
      },
      token
    }
  });
});

// User Login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const emailTrimmed = email.trim().toLowerCase();
  const user = await User.findOne({ email: emailTrimmed }).select('+password');
  if (!user) return next(new AppError('Invalid email or password', 401));

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return next(new AppError('Invalid email or password', 401));

  if (!user.isActive) {
    return next(new AppError('Your account is inactive. Contact admin.', 403));
  }

  if (user.role === 'volunteer') {
    const Volunteer = require('../models/Volunteer');

    const volunteer = await Volunteer.findOne({ userId: user._id });

    if (!volunteer) return next(new AppError('Volunteer profile missing', 400));

    if (volunteer.status !== 'approved') {
      return next(
        new AppError(
          'Your account is not approved yet. Please contact admin.',
          403
        )
      );
    }
  }

  const token = generateToken(user._id);

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role
      },
      token
    }
  });
});

// Get Current User (Profile)
exports.getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ status: 'success', data: { user } });
});

// Update Password
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  const { currentPassword, newPassword } = req.body;

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  user.password = newPassword;
  await user.save();

  const token = generateToken(user._id);
  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully',
    token
  });
});

// Update Profile
exports.updateProfile = catchAsync(async (req, res, next) => {
  const updates = {};
  const { name, phone, district, password } = req.body;

  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (district) updates.district = district;

  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found', 404));

  if (password && password.trim() !== "") {
    user.password = password; 
  }

  Object.assign(user, updates);
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Profile updated successfully",
    data: { user }
  });
});