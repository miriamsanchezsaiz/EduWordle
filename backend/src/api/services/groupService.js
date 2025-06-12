// src/api/services/groupService.js
const { User, Group, StudentGroup, Wordle, WordleGroup } = require('../models'); 
const { Op } = require('sequelize');
const userService = require('./userService'); 
const sequelize = require('../../config/database');
const emailService = require('./emailService'); 
const { generateInitialPassword } = require('../../utils/passwordUtils');
const ApiError = require('../../utils/ApiError');

// CHECKED: Function to get active groups for a specific student user 
const getActiveGroupsForStudent = async (userId) => {
    try {
        const studentUser = await User.findByPk(userId, {
            include: {
                model: Group,
                as: 'groups',
                through: { attributes: [] },
                where: {
                    initDate: { [Op.lte]: new Date() },
                    [Op.or]: [
                        { endDate: null },
                        { endDate: { [Op.gte]: new Date() } }
                    ]
                },
                attributes: ['id', 'name', 'initDate', 'endDate'],
                required: true
            }
        });

        if (!studentUser) {
            throw ApiError.notFound('Student not found.');
            return [];
        }

        return studentUser.groups || [];
    } catch (error) {
        console.debug('Error getting active groups for student:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while getting active groups for student.');
        }
    }
};


// Function to get groups created by a teacher, with optional filters
const getGroupsByTeacher = async (teacherId, filters = {}) => {
    try {
        const teacher = await userService.getUserById(teacherId);
        if (!teacher) {
            throw ApiError.notFound('Teacher not found.');
        }
        if (teacher.role !== 'teacher') {
            throw ApiError.forbidden('User not authorized to view groups.');
        }
        const whereClause = {
            userId: teacherId,
        };

        const now = new Date();

        if (filters.status === 'active') {

            whereClause.initDate = { [Op.lte]: now };
            whereClause[Op.or] = [
                { endDate: null },
                { endDate: { [Op.gte]: now } }
            ];
        } else if (filters.status === 'inactive') {
            whereClause[Op.or] = [
                { initDate: { [Op.gt]: now } },
                { endDate: { [Op.lt]: now } }
            ];
        }

        // Filtros por rango de fechas
        if (filters.startDateFrom || filters.startDateTo) {
            whereClause.initDate = {
                ...(whereClause.initDate || {}),
                ...(filters.startDateFrom && { [Op.gte]: new Date(filters.startDateFrom) }),
                ...(filters.startDateTo && { [Op.lte]: new Date(filters.startDateTo) })
            };
        }

        if (filters.endDateFrom || filters.endDateTo) {
            whereClause.endDate = {
                ...(whereClause.endDate || {}),
                ...(filters.endDateFrom && { [Op.gte]: new Date(filters.endDateFrom) }),
                ...(filters.endDateTo && { [Op.lte]: new Date(filters.endDateTo) })
            };
        }

        const groups = await Group.findAll({
            where: whereClause,
            attributes: ['id', 'name', 'initDate', 'endDate', 'userId']
        });


        // Añade `isActive` a cada grupo (esto es para mostrarlo, no para filtrarlo)
        const today = new Date();
        const groupsWithStatus = groups.map(group => {
            const { initDate, endDate } = group;
            const initDateObj = new Date(initDate);
            const endDateObj = endDate ? new Date(endDate) : null;
            const isActive = initDateObj <= today && (!endDateObj || endDateObj >= today);

            return {
                ...group.toJSON(),
                isActive
            };
        });

        return groupsWithStatus;

    } catch (error) {
        console.debug('Error getting groups by teacher:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while retrieving groups.');
        }
    }
};


// CHECKED: Function to get details of a specific group (Teacher functionality)
const getGroupDetails = async (groupId, currentUserId, currentUserRole) => {

    let group;
    let whereCondition = { id: groupId };

    if (currentUserRole === 'teacher') {
        whereCondition.userId = currentUserId;
        group = await Group.findOne({
            where: whereCondition,
            include: [
                {
                    model: User,
                    as: 'students',
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'email', 'role']
                },
                {
                    model: Wordle,
                    as: 'accessibleWordles',
                    through: { attributes: [] },
                    attributes: ['id', 'name']
                }


            ]
        });
    }
    else if (currentUserRole === 'student') {
        group = await Group.findOne({
            where: whereCondition,
            include: [
                {
                    model: User,
                    as: 'students',
                    through: {
                        model: StudentGroup,
                        where: { userId: currentUserId },
                        attributes: []
                    },
                    attributes: ['id', 'name', 'email', 'role'],
                    required: true
                },
                {
                    model: Wordle,
                    as: 'accessibleWordles',
                    through: { attributes: [] },
                    attributes: ['id', 'name']
                }
            ]
        });
    } else {
        throw ApiError.forbidden('Unsupported user role for group details access.');
    }
    if (!group) {
        throw ApiError.notFound('Group not found or access denied.');
    }

    const groupJson = group.toJSON();

    const now = new Date();
    const initDateObj = new Date(groupJson.initDate);
    const endDateObj = groupJson.endDate ? new Date(groupJson.endDate) : null;
    groupJson.isActive = initDateObj <= now && (!endDateObj || endDateObj >= now);

    return groupJson;


};


const addStudentsToGroup = async (group, studentEmails = [], transaction) => {
    const createdStudents = [];
    const linkedStudents = [];
    const studentUserIdsToLink = [];

    if (studentEmails && studentEmails.length > 0) {

        for (const email of studentEmails) {
            try {
                const existingUser = await userService.findUserByEmail(email);

                if (existingUser) {
                    if (existingUser.role !== 'student') {
                        throw ApiError.badRequest(`User with email ${email} exists but is not a student.`);
                    }
                    const isAlreadyInGroup = await group.hasStudent(existingUser, { transaction });
                    if (isAlreadyInGroup) {
                        console.warn(`Student with email ${email} is already in group ${group.id}. Skipping linking.`);
                        continue;
                    }
                    linkedStudents.push(email);
                    studentUserIdsToLink.push(existingUser.id);


                } else {

                    const initialPassword = generateInitialPassword(email);
                    const newUser = await userService.createUser(email, email.split('@')[0], initialPassword, 'student', transaction);
                    createdStudents.push(email);
                    studentUserIdsToLink.push(newUser.id);



                    emailService.sendWelcomeEmail(newUser.email, newUser.name, initialPassword)
                        .catch(err => console.error(`Failed to send welcome email to ${newUser.email}:`, err));
                }
            } catch (error) {
                console.error(`Error processing student with email ${email}:`, error);
                if (error instanceof ApiError) {
                    throw error;
                } else {
                    throw ApiError.internal(`An unexpected error occurred while processing student ${email}.`);
                }
            }
        }

        try {
            if (studentUserIdsToLink.length > 0) {
                const studentGroupEntries = studentUserIdsToLink.map(userId => ({
                    userId: userId,
                    groupId: group.id
                }));
                await StudentGroup.bulkCreate(studentGroupEntries, { transaction, ignore: true });
            }
        } catch (error) {
            console.error(`Error linking students to group ${group.id}:`, error);
            if (error instanceof ApiError) {
                throw error;
            } else {
                throw ApiError.internal(`An unexpected error occurred while linking students to group ${group.id}.`);
            }
        }

    }

    return { createdStudents, linkedStudents };
};

const updateWordleGroup = async (groupId, updatedWordleIds, externalTransaction = null) => {
    const transaction = externalTransaction || await sequelize.transaction();
    let committedHere = false;

    try {
        if (!externalTransaction) committedHere = true;

        const group = await Group.findByPk(groupId, {
            attributes: ['id', 'userId'], 
            transaction
        });

        if (!group) {
            throw ApiError.notFound('Group not found for Wordle association update.');
        }

        const currentWordleGroups = await WordleGroup.findAll({
            where: { groupId },
            attributes: ['wordleId'], 
            transaction
        });

        const currentWordleIds = currentWordleGroups.map(wg => wg.wordleId);
        const toRemove = currentWordleIds.filter(id => !updatedWordleIds.includes(id));
        const toAdd = updatedWordleIds.filter(id => !currentWordleIds.includes(id));

        if (toRemove.length > 0) {
            await WordleGroup.destroy({
                where: {
                    groupId,
                    wordleId: { [Op.in]: toRemove }
                },
                transaction
            });
        }

        if (toAdd.length > 0) {
            const validWordles = await Wordle.findAll({
                where: {
                    id: { [Op.in]: toAdd },
                    userId: group.userId
                },
                attributes: ['id'],
                transaction
            });

            const validIds = validWordles.map(w => w.id);
            const invalid = toAdd.filter(id => !validIds.includes(id));
            if (invalid.length > 0) {
                throw ApiError.badRequest(`Invalid Wordles: ${invalid.join(', ')}`);
            }

            const entries = validIds.map(id => ({ groupId, wordleId: id }));
            await WordleGroup.bulkCreate(entries, { transaction, ignoreDuplicates: true });
        }

        if (committedHere) await transaction.commit();
    } catch (error) {
        if (committedHere) await transaction.rollback();
        console.error(`Error updating wordles for group ${groupId}:`, error);
        throw error;
    }
};


async function prepareForUpdate(req) {
    const body = req.body;
    const updateData = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.initDate !== undefined) updateData.initDate = body.initDate;
    if (body.endDate !== undefined) updateData.endDate = body.endDate;
    if (Array.isArray(body.studentEmails)) updateData.addStudentEmails = body.studentEmails;
    if (Array.isArray(body.removeStudentIds)) updateData.removeStudentIds = body.removeStudentIds;

    if (Array.isArray(body.wordleIds)) {
        try {
            await updateWordleGroup(req.params.groupId, body.wordleIds, req.transaction);
        } catch (err) {
            console.error("Error actualizando Wordles del grupo:", err);
        }
    }

    return updateData;
}


// Function to create a new group (Teacher functionality)
const createGroup = async (teacherId, groupData, studentEmails = []) => {
    const transaction = await sequelize.transaction();

    try {
        const teacher = await userService.getUserById(teacherId);
        if (!teacher) {
            throw ApiError.notFound('Teacher not found.');
        }
        if (teacher.role !== 'teacher') {
            throw ApiError.forbidden('User not authorized to create groups.');
        }

        // Validar que no exista ya un grupo con ese nombre para ese profesor
        const existingGroup = await Group.findOne({
            where: {
                name: groupData.name.trim(),
                userId: teacherId
            },
            transaction
        });

        if (existingGroup) {
            throw ApiError.badRequest('Ya existe un grupo con ese nombre para este profesor.');
        }

        const newGroup = await Group.create({
            name: groupData.name,
            initDate: new Date(groupData.initDate),
            endDate: groupData.endDate ? new Date(groupData.endDate) : null,
            userId: teacherId
        }, { transaction });

        const { createdStudents, linkedStudents } = await addStudentsToGroup(newGroup, studentEmails, transaction);
        if (Array.isArray(groupData.wordleIds)) {
        await updateWordleGroup(newGroup.id, groupData.wordleIds, transaction);
        }

        await transaction.commit();

        const groupWithStudentsAndWordles = await Group.findByPk(newGroup.id, {
            include: [
                {
                    model: User,
                    as: 'students',
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'email', 'role']
                },
                {
                    model: Wordle,
                    as: 'accessibleWordles',
                    through: { attributes: [] },
                    attributes: ['id', 'name']
                }
            ]
        });


        return {
            ...groupWithStudentsAndWordles.toJSON(),
            createdStudents,
            linkedStudents,
        };

    } catch (error) {
        await transaction.rollback();
        console.debug('Error creating group:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while creating the group.');
        }
    }
};



// Function to update a specific group (Teacher functionality)
const updateGroup = async (groupId, teacherId, updateData) => {
    const transaction = await sequelize.transaction();

    try {
        // 1. Find the group and verify it belongs to the teacher
        const group = await Group.findOne({
            where: {
                id: groupId,
                userId: teacherId
            },
            transaction,
            include: [
              {
                model: User,
                as: 'students',
                attributes: ['id', 'email', 'role']
              },
              {
                model: Wordle,
                as: 'accessibleWordles',
                attributes: ['id'] 
              }
            ]
        });

        if (!group) {
            await transaction.rollback();
            throw ApiError.notFound('Group not found or access denied.')
        }

        if (updateData.name) {
            const duplicateGroup = await Group.findOne({
                where: {
                    name: updateData.name.trim(),
                    userId: teacherId,
                    id: { [Op.ne]: groupId } // excluir el grupo actual
                },
                transaction
            });

            if (duplicateGroup) {
                throw ApiError.badRequest('Ya existe otro grupo con ese nombre para este profesor.');
            }
        }


        // 2. Update group basic details
        if (updateData.name !== undefined) group.name = updateData.name;
        if (updateData.initDate !== undefined) group.initDate = updateData.initDate;
        if (updateData.endDate !== undefined) group.endDate = updateData.endDate;

        await group.save({ transaction });

        // 3. Manage adding students using the new function
        const addStudentEmails = updateData.addStudentEmails || [];
        const { createdStudents, linkedStudents } = await addStudentsToGroup(group, addStudentEmails, transaction);

        // 4. Manage removing students
        const removedStudentIds = updateData.removeStudentIds || [];
        if (removedStudentIds.length > 0) {
            await group.removeStudents(removedStudentIds, { transaction });

            await Promise.all(removedStudentIds.map(async (userId) => {
                await userService.deleteStudentIfNoGroups(userId, transaction);
            }));
        }

        // 5. Gestionar la asociación/desasociación de Wordles
        if (updateData.addWordleIds || updateData.removeWordleIds) {
            
            const currentWordleIds = group.accessibleWordles.map(w => w.id);
            const targetWordleIds = new Set(currentWordleIds);

            if (Array.isArray(updateData.addWordleIds)) {
                updateData.addWordleIds.forEach(id => targetWordleIds.add(id));
            }
            if (Array.isArray(updateData.removeWordleIds)) {
                updateData.removeWordleIds.forEach(id => targetWordleIds.delete(id));
            }
            await updateWordleGroup(groupId, Array.from(targetWordleIds), transaction);
        }

        await transaction.commit();

        // Fetch the updated group again to include the current list of students for the response
        const updatedGroupWithStudents = await Group.findByPk(groupId, {
            include: {
                model: User,
                as: 'students',
                through: { attributes: [] },
                attributes: ['id', 'name', 'email', 'role']
            }
        });
        const now = new Date();
        const initDateObj = new Date(updatedGroupWithStudents.initDate);
        const endDateObj = updatedGroupWithStudents.endDate ? new Date(updatedGroupWithStudents.endDate) : null;
        updatedGroupWithStudents.dataValues.isActive = initDateObj <= now && (!endDateObj || endDateObj >= now);


        return {
            ...updatedGroupWithStudents.toJSON(),
            createdStudents: createdStudents, 
            linkedStudents: linkedStudents,   

        };

    } catch (error) {
        await transaction.rollback();
        console.debug('Error updating group:', error);
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw ApiError.internal('An unexpected error occurred while updating the group.');
        }
    }
};


// Function to delete a specific group (Teacher functionality)
const deleteGroup = async (groupId, teacherId) => {
    const transaction = await sequelize.transaction(); 

    try {
        // 1. Find the group and verify it belongs to the teacher
        const group = await Group.findOne({
            where: {
                id: groupId,
            },
            transaction
        });

        if (!group) {
            await transaction.rollback();
            throw ApiError.notFound('Group not found.');
        }
        if (group.userId !== teacherId) {
            await transaction.rollback();
            throw ApiError.forbidden('You are not authorized to delete this group. Only the group creator can delete it.');
        }

        const studentsInGroup = await group.getStudents({
            attributes: ['id'], 
            through: { attributes: [] },
            transaction
        });
        const studentIdsInGroup = studentsInGroup.map(student => student.id);


        // 2. Delete the group
        await group.destroy({ transaction }); 

        await Promise.all(studentIdsInGroup.map(async (userId) => {
            await userService.deleteStudentIfNoGroups(userId, transaction);
        }));


        await transaction.commit(); 
        return true; 

    } catch (error) {
        await transaction.rollback(); 
        console.debug('Error deleting group in groupService:', error);
        if (error instanceof ApiError) {
            throw error; 
        } else {
            throw ApiError.internal('An unexpected error occurred while deleting the group.'); 
        }
    }
};

// Function to check if a student is in any gruop created by a specific teacher
const isStudentInTeacherGroup = async (studentId, teacherId) => {
    try {
        const student = await User.findByPk(studentId);
        if (!student || student.role !== 'student') {
            return false;
        }

        const groups = await student.getGroups({
            where: { userId: teacherId },
            through: { attributes: [] },
            attributes: ['id']
        });

        return groups.length > 0 && groups.some(group => group.userId === teacherId);;


    } catch (error) {
        console.debug('Error checking if student is in any group:', error);
        throw error;
    }
};


module.exports = {
    getActiveGroupsForStudent,
    createGroup,
    getGroupsByTeacher,
    getGroupDetails,
    updateGroup,
    deleteGroup,
    isStudentInTeacherGroup,
    prepareForUpdate,
};
