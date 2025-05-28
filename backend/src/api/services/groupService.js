// src/api/services/groupService.js
const { User, Group, StudentGroup, Wordle, WordleGroup } = require('../models'); // Import necessary models
const { Op } = require('sequelize'); // Import Op for Sequelize operators
const userService = require('./userService'); // Import userService to create/find users
const sequelize = require('../../config/database');
const emailService = require('./emailService'); // Import the new email service
const { generateInitialPassword } = require('../../utils/passwordUtils');


// Function to get active groups for a specific student user (already implemented)
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
            throw new NotFoundError('Student not found.');
            return []; 
        }

        return studentUser.groups || [];
    } catch (error) {
        console.debug('Error getting active groups for student:', error);
        throw error;
    }
};


// Function to get groups created by a teacher, with optional filters
const getGroupsByTeacher = async (teacherId, filters = {}) => {
    try {
        const teacher = await userService.getUserById(teacherId);
        if (!teacher || teacher.role !== 'teacher') {
            throw new Error('User not found or not authorized to view groups');
        }

        const whereClause = {
            userId: teacherId,
        };

        // console.log('FINAL-DEBUG groupService.getGroupsByTeacher: filters.status:', filters.status);

        // Estado activo/inactivo
        const now = new Date();

        // console.log('FINAL-DEBUG groupService.getGroupsByTeacher: now:', now);

        if (filters.status === 'active') {

            whereClause.initDate = { [Op.lte]: now };
            whereClause[Op.or] = [
                { endDate: null },
                { endDate: { [Op.gte]: now } }
            ];
        } else if (filters.status === 'inactive') {
            whereClause[Op.or] = [
                { initDate: { [Op.gt]: now } }, // No ha empezado
                { endDate: { [Op.lt]: now } }   // Ya terminó
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

        console.log('MEGA-FINAL-DEBUG groupService.getGroupsByTeacher: whereClause:', whereClause);

        const groups = await Group.findAll({
            where: whereClause,
            attributes: ['id', 'name', 'initDate', 'endDate', 'userId']
        });


        // Añade `isActive` a cada grupo (esto es para mostrarlo, no para filtrarlo)
        const today = new Date();
        const groupsWithStatus = groups.map(group => {
            const { initDate, endDate } = group;

            // Convertir a fecha si es necesario
            const initDateObj = new Date(initDate);
            const endDateObj = endDate ? new Date(endDate) : null;
            const isActive = initDateObj <= today && (!endDateObj || endDateObj >= today);
            // console.log('FINAL-DEBUG : Grupo:', group.name);
            // console.log('FINAL-DEBUG : init:', initDateObj.toISOString(), 'end:', endDateObj?.toISOString(), 'today:', today.toISOString());
            // console.log('FINAL-DEBUG : isActive:', isActive);

            return {
                ...group.toJSON(),
                isActive
            };
        });

        return groupsWithStatus;

    } catch (error) {
        console.debug('Error getting groups by teacher:', error);
        throw error;
    }
};


// Function to get details of a specific group (Teacher functionality)
const getGroupDetails = async (groupId, teacherId) => {
    try {
        // Find the group and verify it belongs to the teacher
        const group = await Group.findOne({
            where: {
                id: groupId,
                userId: teacherId
            },
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

        // Return group details or null if not found or access denied
        return group ? group.toJSON() : null;

    } catch (error) {
        console.debug('Error getting group details:', error);
        throw error;
    }
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
                        console.warn(`User with email ${email} exists but is not a student (role: ${existingUser.role}). Skipping linking to group.`);
                        throw new Error(`User with email ${email} exists but is not a student.`); continue;
                    }
                    const isAlreadyInGroup = await group.hasStudent(existingUser, { transaction });
                    if (isAlreadyInGroup) {
                        console.warn(`Student with email ${email} is already in group ${group.id}. Skipping linking.`);
                        throw new Error(`Student with email ${email} is already in group ${group.id}.`);
                    }
                    linkedStudents.push(email);
                    studentUserIdsToLink.push(existingUser.id);


                } else {

                    const initialPassword = generateInitialPassword();
                    const newUser = await userService.createUser(email, email.split('@')[0], initialPassword, 'student', transaction);
                    createdStudents.push(email);
                    studentUserIdsToLink.push(newUser.id);



                    emailService.sendWelcomeEmail(newUser.email, newUser.name, initialPassword)
                        .catch(err => console.debug(`Failed to send email to ${newUser.email}:`, err));
                }
            } catch (error) {
                console.error(`Error processing student with email ${email}:`, error);
                throw error;
            }
        }

        // 4. Link students to the group using bulkCreate (only for those que no estaban previamente)
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
            throw error;
        }

    }

    return { createdStudents, linkedStudents };
};

const updateWordleGroup = async (groupId, updatedWordleIds) => {
  const current = await WordleGroup.findAll({ where: { groupId } });
  const currentIds = current.map(wg => wg.wordleId);
  // Wordles a eliminar: estaban, pero ya no vienen
  const toRemove = currentIds.filter(id => !updatedWordleIds.includes(id));
  if (toRemove.length) {
    await WordleGroup.destroy({
      where: { groupId, wordleId: toRemove }
    });
  }
  // Wordles a añadir: vienen, pero no estaban
  const toAdd = updatedWordleIds.filter(id => !currentIds.includes(id));
  for (const wordleId of toAdd) {
    await WordleGroup.create({ groupId, wordleId });
  }
};

const prepareForUpdate = async (teacherId, groupData, studentEmails = [], updatedWordleIds = []) => {
  const currentLinks = await StudentGroup.findAll({ where: { groupId: groupData.id } });
  const currentStudentIds = currentLinks.map(link => link.studentId);

  const currentStudents = await Student.findAll({ where: { id: currentStudentIds } });
  const currentEmails   = currentStudents.map(s => s.email);

  const removeStudentIds = currentStudents
    .filter(s => !studentEmails.includes(s.email))
    .map(s => s.id);

  const addStudentEmails = studentEmails.filter(email => !currentEmails.includes(email));

  await updateWordleGroup(groupData.id, updatedWordleIds);

  return await updateGroup(
    groupData.id,
    teacherId,
    {
      name:             groupData.name,
      initDate:         groupData.startDate,
      endDate:          groupData.endDate,
      addStudentEmails,
      removeStudentIds
    }
  );
};

// Function to create a new group (Teacher functionality)
const createGroup = async (teacherId, groupData, studentEmails = []) => {
    const transaction = await sequelize.transaction();

    try {
        console.log('DEBUG groupService.createGroup: Start.');
        console.log('DEBUG groupService.createGroup: Received teacherId parameter:', teacherId);
        console.log('DEBUG groupService.createGroup: Type of teacherId parameter:', typeof teacherId);
        console.log('DEBUG groupService.createGroup: Received groupData:', JSON.stringify(groupData));
        console.log('DEBUG groupService.createGroup: Received studentEmails:', studentEmails);

        const teacher = await userService.getUserById(teacherId);
        console.log('DEBUG groupService.createGroup: Found teacher:', teacher ? teacher.id : null);

        if (!teacher || teacher.role !== 'teacher') {
            throw new Error('User not found or not authorized to create groups');
        }

        console.log('DEBUG groupService.createGroup: Proceeding to Group.create with userId:', teacherId);

        const newGroup = await Group.create({
            name: groupData.name,
            initDate: new Date(groupData.startDate),
            endDate: new Date(groupData.endDate),
            userId: teacherId
        }, { transaction });

        console.log('DEBUG groupService.createGroup: Group created with ID:', newGroup.id);

        const { createdStudents, linkedStudents } = await addStudentsToGroup(newGroup, studentEmails, transaction);

        await transaction.commit();



        const groupWithStudents = await Group.findByPk(newGroup.id, {
            include: {
                model: User,
                as: 'students',
                through: { attributes: [] },
                attributes: ['id', 'name', 'email', 'role']
            }
        });

        return {
            ...groupWithStudents.toJSON(),
            createdStudents: createdStudents,
            linkedStudents: linkedStudents,

        };

    } catch (error) {
        await transaction.rollback();
        console.debug('Error creating group:', error);
        throw error;
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
            transaction
        });

        if (!group) {
            await transaction.rollback();
            return null;
        }

        // 2. Update group basic details
        if (updateData.name !== undefined) group.name = updateData.name;
        if (updateData.startDate !== undefined) group.initDate = updateData.startDate;
        if (updateData.endDate !== undefined) group.endDate = updateData.endDate;

        await group.save({ transaction });

        // 3. Manage adding students using the new function
        const addStudentEmails = updateData.addStudentEmails || [];
        const { createdStudents, linkedStudents } = await addStudentsToGroup(group, addStudentEmails, transaction);

        // 4. Manage removing students
        const removedStudentIds = updateData.removeStudentIds || [];
        if (removedStudentIds.length > 0) {
            await group.removeStudents(removedStudentIds, { transaction });

            // Consider if you want to handle the deletion of students with no groups here
            // or in a separate process as discussed previously.
            await Promise.all(removedStudentIds.map(async (userId) => {
                await userService.deleteStudentIfNoGroups(userId, transaction);
            }));
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

        return {
            ...updatedGroupWithStudents.toJSON(),
            createdStudents: createdStudents, // Students created during this update
            linkedStudents: linkedStudents,   // Students linked during this update

        };

    } catch (error) {
        await transaction.rollback();
        console.debug('Error updating group:', error);
        throw error;
    }
};



// Function to delete a specific group (Teacher functionality)
const deleteGroup = async (groupId, teacherId) => {
    const transaction = await sequelize.transaction(); // Start a transaction

    try {
        // 1. Find the group and verify it belongs to the teacher
        const group = await Group.findOne({
            where: {
                id: groupId,
                userId: teacherId // Ensure the group is created by this teacher
            },
            transaction
        });

        if (!group) {
            await transaction.rollback();
            return false; // Group not found or access denied
        }

        // Get the list of student IDs in this group BEFORE deleting the group
        const studentsInGroup = await group.getStudents({
            attributes: ['id'], // Only fetch IDs
            through: { attributes: [] },
            transaction
        });
        const studentIdsInGroup = studentsInGroup.map(student => student.id);


        // 2. Delete the group
        // Sequelize should handle cascading deletes for associations defined with ON DELETE CASCADE
        // If not using ON DELETE CASCADE in DB, you might need to manually delete
        // entries in join tables (StudentGroup, WordleGroup) first.
        // Your SQL scripts for wordle_groups had ON DELETE CASCADE, but student_groups didn't.
        // You might need to manually delete from student_groups here.
        // await StudentGroup.destroy({ where: { groupId: groupId }, transaction }); // Example if needed

        await group.destroy({ transaction }); // Delete the group

        // After deleting the group, check if any of the students who were in this group
        // now have no groups and should be deleted.
        // Use Promise.all to run checks concurrently
        await Promise.all(studentIdsInGroup.map(async (userId) => {
            // Pass the transaction to deleteStudentIfNoGroups
            await userService.deleteStudentIfNoGroups(userId, transaction);
        }));


        await transaction.commit(); // Commit the transaction
        return true; // Indicate successful deletion

    } catch (error) {
        await transaction.rollback(); // Rollback transaction on error
        console.debug('Error deleting group:', error);
        throw error;
    }
};

// Function to check if a student is in any gruop created by a specific teacher
const isStudentInTeacherGroup = async (studentId, teacherId) => {
    try {
        const student = await User.findByPk(studentId);
        if (!student || student.role !== 'student') {
            return false; // Student not found or not a student
        }

        const groups = await student.getStudentGroups({
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
