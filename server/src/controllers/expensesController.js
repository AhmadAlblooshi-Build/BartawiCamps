import { validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';

/**
 * GET /api/expenses
 * List all expenses with filters
 */
export const getExpenses = async (req, res) => {
  try {
    const {
      camp_id,
      category_id,
      month,
      year,
      date_from,
      date_to,
      page = 1,
      limit = 50,
    } = req.query;

    // Build where clause
    const where = {
      camps: {
        tenant_id: req.tenantId,
      },
    };

    if (camp_id) where.camp_id = camp_id;
    if (category_id) where.category_id = category_id;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    if (date_from || date_to) {
      where.expense_date = {};
      if (date_from) where.expense_date.gte = new Date(date_from);
      if (date_to) where.expense_date.lte = new Date(date_to);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count
    const totalCount = await prisma.expenses.count({ where });

    // Fetch expenses
    const expenses = await prisma.expenses.findMany({
      where,
      include: {
        camps: {
          select: {
            name: true,
            code: true,
          },
        },
        expense_categories: {
          select: {
            name: true,
          },
        },
        users_expenses_created_byTousers: {
          select: {
            full_name: true,
          },
        },
        users_expenses_approved_byTousers: {
          select: {
            full_name: true,
          },
        },
      },
      orderBy: {
        expense_date: 'desc',
      },
      skip,
      take,
    });

    // Calculate summary
    const summary = expenses.reduce(
      (acc, expense) => {
        acc.totalAmount += Number(expense.amount);
        const category = expense.expense_categories.name;
        acc.byCategory[category] = (acc.byCategory[category] || 0) + Number(expense.amount);
        return acc;
      },
      { totalAmount: 0, byCategory: {} }
    );

    res.json({
      success: true,
      data: expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
      summary,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expenses',
      message: error.message,
    });
  }
};

/**
 * GET /api/expenses/:expenseId
 * Get single expense details
 */
export const getExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const expense = await prisma.expenses.findFirst({
      where: {
        id: expenseId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
      include: {
        camps: true,
        expense_categories: true,
        users_expenses_created_byTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        users_expenses_approved_byTousers: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense',
      message: error.message,
    });
  }
};

/**
 * POST /api/expenses
 * Create a new expense
 */
export const createExpense = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      camp_id,
      category_id,
      amount,
      description,
      expense_date,
      payment_method,
      reference_number,
      receipt_url,
    } = req.body;

    // Verify camp belongs to tenant
    const camp = await prisma.camps.findFirst({
      where: {
        id: camp_id,
        tenant_id: req.tenantId,
      },
    });

    if (!camp) {
      return res.status(404).json({
        success: false,
        error: 'Camp not found',
      });
    }

    // Verify category exists for tenant
    const category = await prisma.expense_categories.findFirst({
      where: {
        id: category_id,
        tenant_id: req.tenantId,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Expense category not found',
      });
    }

    // Extract month and year from expense_date
    const date = new Date(expense_date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // Create expense
    const expense = await prisma.expenses.create({
      data: {
        camp_id,
        category_id,
        amount,
        description,
        expense_date: date,
        month,
        year,
        payment_method,
        reference_number,
        receipt_url,
        // created_by: req.userId, // TODO: Set when auth implemented
      },
      include: {
        camps: true,
        expense_categories: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense,
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create expense',
      message: error.message,
    });
  }
};

/**
 * PUT /api/expenses/:expenseId
 * Update an expense
 */
export const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const {
      amount,
      description,
      expense_date,
      payment_method,
      reference_number,
      receipt_url,
      approved_by,
    } = req.body;

    // Verify expense exists and belongs to tenant
    const existing = await prisma.expenses.findFirst({
      where: {
        id: expenseId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    // Prepare update data
    const updateData = {
      amount,
      description,
      payment_method,
      reference_number,
      receipt_url,
      approved_by,
      updated_at: new Date(),
    };

    // If expense_date changed, update month and year
    if (expense_date) {
      const date = new Date(expense_date);
      updateData.expense_date = date;
      updateData.month = date.getMonth() + 1;
      updateData.year = date.getFullYear();
    }

    // Update expense
    const updated = await prisma.expenses.update({
      where: { id: expenseId },
      data: updateData,
      include: {
        camps: true,
        expense_categories: true,
        users_expenses_approved_byTousers: {
          select: {
            full_name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update expense',
      message: error.message,
    });
  }
};

/**
 * DELETE /api/expenses/:expenseId
 * Delete an expense
 */
export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    // Verify expense exists and belongs to tenant
    const existing = await prisma.expenses.findFirst({
      where: {
        id: expenseId,
        camps: {
          tenant_id: req.tenantId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    // Delete expense
    await prisma.expenses.delete({
      where: { id: expenseId },
    });

    res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete expense',
      message: error.message,
    });
  }
};
