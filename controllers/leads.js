const {Lead} = require("../models");
const Sequelize = require("sequelize");
const moment = require("moment");
const Op = Sequelize.Op;

exports.getLeads = async (req, res) => {
    const {
        channel,
        status,
        assigned,
        lead_quality,
        q,
        location,
        dateRange,
        followUpDate,
        page = 0,
        pageSize = 10
    } = req.query;

    const whereClause = {};

    // Build the whereClause object dynamically based on filter values
    if (channel) whereClause.channel = channel;
    if (status) whereClause.status = status;
    if (lead_quality) whereClause.lead_quality = lead_quality;
    if (assigned) whereClause.assigned = assigned;
    if (location) whereClause.location = location;
    if (followUpDate) whereClause.follow_up_date = followUpDate;

    if (dateRange) {
        const {startDate, endDate} = dateRange;
        if (startDate && endDate) {
            whereClause.lead_date = {
                [Op.between]: [startDate, endDate]
            };
        }
    }
    // Add search query to whereClause if provided
    if (q) {
        whereClause[Op.or] = [
            {client_name: {[Op.like]: `%${q}%`}},
            {phone: {[Op.like]: `%${q}%`}},
            {email: {[Op.like]: `%${q}%`}},
            {channel: {[Op.like]: `%${q}%`}},
            {status: {[Op.like]: `%${q}%`}},
            {location: {[Op.like]: `%${q}%`}}
        ];
    }

    try {
        const leads = await Lead.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            // limit: parseInt(pageSize),
            // offset: parseInt(page) * parseInt(pageSize),
        });


        res.status(200).json({success: true, data: leads});
    } catch (error) {
        res.status(500).json({success: false, error: error.message});
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const {country, location, channel, assigned, dateRange} = req.query;

        // Build the whereClause object dynamically based on filter values
        const whereClause = {
            ...(country && {country}),
            ...(location && {location}),
            ...(channel && {channel}),
            ...(assigned && {assigned}),
        };

        if (dateRange) {
            const {startDate, endDate} = dateRange;
            if (startDate && endDate) {
                whereClause.lead_date = {
                    [Op.between]: [startDate, endDate]
                };
            }
        }
        const result = await Lead.findAll({
            where: whereClause,
        });


        if (!result) {
            return res.status(404).json({
                success: false,
                data: {}
            });
        }

        const leadQualityValues = ['Bad', 'Avg', 'Good', 'High Quality'];
        const leadStatusValues = ['Yet to Connect', 'Follow-up 1', 'Follow-up 2', 'Follow-up 3', 'Store visit follow-up', 'To be closed', 'Lost', 'Converted'];

        const leadQualityCounts = await getCountsByAttribute('lead_quality', leadQualityValues, whereClause);
        const leadStatusCounts = await getCountsByAttribute('status', leadStatusValues, whereClause);

        res.status(200).json({
            success: true,
            data: result,
            leadQualityCounts,
            leadStatusCounts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

const getCountsByAttribute = async (attribute, values, where) => {
    const counts = {};
    for (const value of values) {
        counts[value] = await Lead.count({
            where: {[attribute]: value, ...where}
        });
    }
    return counts;
};

exports.addLead = async (req, res) => {
    try {
        let result = await Lead.create(req.body);
        res.status(200).json({
            success: true,
        });
    } catch (error) {
        res.status(500).json(error)
    }

}

exports.updateLead = async (req, res) => {
    try {
        let id = req.params.id
        let data = req.body

        await Lead.update(data, {where: {id}});

        res.status(200).json({
            success: true,
        });
    } catch (error) {
        res.status(500).json(error)
    }

}

exports.getLeadById = async (req, res) => {
    const { id } = req.params;

    try {
        const lead = await Lead.findOne({
            where: { id }
        });

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        res.status(200).json({ success: true, data: lead });
    } catch (error) {
        console.error('Error fetching lead by ID:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};